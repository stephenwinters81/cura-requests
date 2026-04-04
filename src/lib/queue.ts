import { Queue } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/db";
import { dispatchWebhook } from "@/lib/webhook";
import type { DeliveryJobType, RequestStatus } from "@/lib/types";

// --- Redis Connection (singleton) ---

let redisConnection: IORedis | undefined;

export function getRedisConnection(): IORedis {
  if (!redisConnection) {
    redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
  }
  return redisConnection;
}

// --- Delivery Job Payload ---

export interface DeliveryJobPayload {
  requestId: string;
  deliveryJobId: string;
  type: DeliveryJobType;
  recipient: string;
  pdfPath: string;
}

// --- BullMQ Queue (singleton) ---

const globalForQueue = globalThis as unknown as {
  deliveryQueue: Queue<DeliveryJobPayload> | undefined;
};

export const deliveryQueue: Queue<DeliveryJobPayload> =
  globalForQueue.deliveryQueue ??
  new Queue<DeliveryJobPayload>("delivery", {
    connection: getRedisConnection(),
  });

if (process.env.NODE_ENV !== "production") {
  globalForQueue.deliveryQueue = deliveryQueue;
}

// --- Custom backoff delays (ms) ---

const BACKOFF_DELAYS = [30_000, 120_000, 600_000]; // 30s, 2min, 10min

// --- Queue a delivery job ---

export async function queueDelivery(
  requestId: string,
  deliveryJobId: string,
  type: DeliveryJobType,
  recipient: string,
  pdfPath: string
): Promise<void> {
  await deliveryQueue.add(
    type,
    { requestId, deliveryJobId, type, recipient, pdfPath },
    {
      jobId: deliveryJobId, // idempotency — same ID won't be queued twice
      attempts: 3,
      backoff: {
        type: "custom",
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    }
  );
}

// --- Custom backoff strategy (exported for worker) ---

export function getBackoffDelay(attemptsMade: number): number {
  const index = Math.min(attemptsMade - 1, BACKOFF_DELAYS.length - 1);
  return BACKOFF_DELAYS[index];
}

// --- Recalculate parent request status from child jobs ---

export async function recalculateRequestStatus(requestId: string): Promise<void> {
  // Use a serializable transaction to prevent concurrent workers from reading stale state
  const newStatus = await prisma.$transaction(async (tx) => {
    const jobs = await tx.deliveryJob.findMany({
      where: { requestId },
      select: { status: true },
    });

    if (jobs.length === 0) return null;

    const statuses = jobs.map((j) => j.status);

    let status: RequestStatus;
    if (statuses.every((s) => s === "delivered")) {
      status = "delivered";
    } else if (statuses.every((s) => s === "failed")) {
      status = "failed";
    } else if (statuses.some((s) => s === "delivered") && statuses.some((s) => s === "failed")) {
      status = "partial";
    } else {
      status = "pending";
    }

    await tx.imagingRequest.update({
      where: { id: requestId },
      data: { status },
    });

    return status;
  }, { isolationLevel: "Serializable" });

  if (!newStatus) return;

  // Dispatch webhook outside the transaction
  const webhookKeys = await prisma.apiKey.findMany({
    where: { webhookUrl: { not: null }, revokedAt: null },
  });
  for (const key of webhookKeys) {
    dispatchWebhook(key, "request.status_changed", {
      requestId,
      requestStatus: newStatus,
    });
  }
}
