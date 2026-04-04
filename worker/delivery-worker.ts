import { Worker, Job } from "bullmq";
import fs from "fs";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { decryptJson } from "@/lib/encryption";
import {
  getRedisConnection,
  getBackoffDelay,
  recalculateRequestStatus,
  queueDelivery,
  type DeliveryJobPayload,
} from "@/lib/queue";
import { sendProviderEmail, sendFilingEmail, sendPatientEmail } from "@/lib/email";
import { sendFax } from "@/lib/fax";
import { dispatchWebhook } from "@/lib/webhook";
import type { ParsedPhi } from "@/lib/types";

// --- Load and decrypt PDF from disk ---

function loadPdfBuffer(pdfPath: string): Buffer {
  const encryptedData = fs.readFileSync(pdfPath);
  const key = process.env.PDF_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("PDF_ENCRYPTION_KEY not configured");
  }

  // First 16 bytes are the IV, remainder is ciphertext
  const iv = encryptedData.subarray(0, 16);
  const ciphertext = encryptedData.subarray(16);

  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(key, "hex"),
    iv
  );

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// --- Job processor ---

async function processDeliveryJob(job: Job<DeliveryJobPayload>): Promise<void> {
  const { requestId, deliveryJobId, type, recipient, pdfPath } = job.data;

  // Load delivery job with related data
  const deliveryJob = await prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    include: {
      request: {
        include: {
          practice: true,
          provider: true,
        },
      },
    },
  });

  if (!deliveryJob) {
    throw new Error(`DeliveryJob ${deliveryJobId} not found`);
  }

  // Idempotency: skip if already delivered or sent
  if (deliveryJob.status === "delivered" || deliveryJob.status === "sent") {
    console.log(`Job ${deliveryJobId} already ${deliveryJob.status}, skipping`);
    return;
  }

  // Mark as processing and increment attempts
  await prisma.deliveryJob.update({
    where: { id: deliveryJobId },
    data: {
      status: "processing",
      attempts: { increment: 1 },
    },
  });

  // Load and decrypt PDF
  const pdfBuffer = loadPdfBuffer(pdfPath);

  // Build request data — decrypt parsedPhi for patient name
  const request = deliveryJob.request;
  let patientName = "Patient";

  if (request.parsedPhi) {
    try {
      const parsed = await decryptJson<ParsedPhi>(request.parsedPhi as string);
      if (parsed.names && parsed.names.length > 0) {
        patientName = parsed.names[0];
      }
    } catch (error) {
      console.error("Failed to decrypt parsedPhi, using fallback name:", error);
    }
  }

  const requestData = {
    patientName,
    examType: request.examType,
    providerName: request.provider.doctorName,
    practiceName: request.practice?.name || "Unknown Practice",
  };

  // Execute delivery by type
  switch (type) {
    case "provider_email": {
      const result = await sendProviderEmail(recipient, pdfBuffer, requestData);
      if (!result.success) {
        await prisma.deliveryJob.update({
          where: { id: deliveryJobId },
          data: { lastError: result.error },
        });
        throw new Error(result.error || "Provider email failed");
      }
      await prisma.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: "delivered",
          confirmedAt: new Date(),
          externalId: result.messageId,
        },
      });
      break;
    }

    case "provider_fax": {
      const result = await sendFax(recipient, pdfBuffer, requestData);
      if (!result.success) {
        await prisma.deliveryJob.update({
          where: { id: deliveryJobId },
          data: { lastError: result.error },
        });
        throw new Error(result.error || "Fax send failed");
      }
      // Fax is "sent" — confirmation comes via webhook
      await prisma.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: "sent",
          externalId: result.faxId,
        },
      });
      break;
    }

    case "filing_email": {
      const result = await sendFilingEmail(recipient, pdfBuffer, requestData);
      if (!result.success) {
        await prisma.deliveryJob.update({
          where: { id: deliveryJobId },
          data: { lastError: result.error },
        });
        throw new Error(result.error || "Filing email failed");
      }
      await prisma.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: "delivered",
          confirmedAt: new Date(),
          externalId: result.messageId,
        },
      });
      break;
    }

    case "patient_email": {
      const result = await sendPatientEmail(recipient, pdfBuffer, requestData);
      if (!result.success) {
        await prisma.deliveryJob.update({
          where: { id: deliveryJobId },
          data: { lastError: result.error },
        });
        throw new Error(result.error || "Patient email failed");
      }
      await prisma.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: "delivered",
          confirmedAt: new Date(),
          externalId: result.messageId,
        },
      });
      break;
    }

    default:
      throw new Error(`Unknown delivery type: ${type}`);
  }

  // Recalculate parent request status
  await recalculateRequestStatus(requestId);

  // Audit log (no PHI — just IDs and type)
  await logAudit(
    null,
    "delivery_completed",
    "imaging_request",
    requestId,
    `Delivery ${type} ${deliveryJobId} completed`
  );

  // Dispatch delivery.status_changed webhook to all active API keys with webhooks
  const updatedJob = await prisma.deliveryJob.findUnique({
    where: { id: deliveryJobId },
    select: { id: true, type: true, status: true, confirmedAt: true },
  });
  const updatedRequest = await prisma.imagingRequest.findUnique({
    where: { id: requestId },
    select: { status: true },
  });
  const webhookKeys = await prisma.apiKey.findMany({
    where: { webhookUrl: { not: null }, revokedAt: null },
  });
  for (const key of webhookKeys) {
    dispatchWebhook(key, "delivery.status_changed", {
      requestId,
      deliveryJob: {
        id: updatedJob?.id,
        type: updatedJob?.type,
        status: updatedJob?.status,
        confirmedAt: updatedJob?.confirmedAt?.toISOString() ?? null,
      },
      requestStatus: updatedRequest?.status,
    });
  }
}

// --- Create the worker ---

const worker = new Worker<DeliveryJobPayload>("delivery", processDeliveryJob, {
  connection: getRedisConnection(),
  concurrency: 5,
  settings: {
    backoffStrategy: (attemptsMade: number) => {
      return getBackoffDelay(attemptsMade);
    },
  },
});

// --- Handle failed jobs (after all retries exhausted) ---

worker.on("failed", async (job, error) => {
  if (!job) return;

  const { deliveryJobId, requestId, type, pdfPath } = job.data;
  console.error(`Job ${deliveryJobId} failed permanently after ${job.attemptsMade} attempts:`, error.message);

  try {
    await prisma.deliveryJob.update({
      where: { id: deliveryJobId },
      data: {
        status: "failed",
        lastError: error.message,
      },
    });

    // Fax fallback: if a provider_email failed, queue a fax if the practice has one
    if (type === "provider_email") {
      const request = await prisma.imagingRequest.findUnique({
        where: { id: requestId },
        include: { practice: { select: { fax: true } } },
      });

      if (request?.practice?.fax) {
        console.log(`Email failed for request ${requestId} — falling back to fax`);

        const faxJob = await prisma.deliveryJob.create({
          data: {
            requestId,
            type: "provider_fax",
            status: "queued",
            attempts: 0,
          },
        });

        await queueDelivery(
          requestId,
          faxJob.id,
          "provider_fax",
          request.practice.fax,
          pdfPath
        );
      }
    }

    await recalculateRequestStatus(requestId);

    // Dispatch delivery.status_changed webhook for failed job
    const updatedRequest = await prisma.imagingRequest.findUnique({
      where: { id: requestId },
      select: { status: true },
    });
    const webhookKeys = await prisma.apiKey.findMany({
      where: { webhookUrl: { not: null }, revokedAt: null },
    });
    for (const key of webhookKeys) {
      dispatchWebhook(key, "delivery.status_changed", {
        requestId,
        deliveryJob: {
          id: deliveryJobId,
          type: job.data.type,
          status: "failed",
          confirmedAt: null,
        },
        requestStatus: updatedRequest?.status,
      });
    }
  } catch (updateError) {
    console.error(`Failed to update job ${deliveryJobId} status:`, updateError);
  }
});

worker.on("completed", (job) => {
  if (job) {
    console.log(`Job ${job.data.deliveryJobId} (${job.data.type}) completed`);
  }
});

worker.on("error", (error) => {
  console.error("Worker error:", error);
});

// --- Graceful shutdown ---

async function shutdown() {
  console.log("Shutting down delivery worker...");
  await worker.close();
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

console.log("Delivery worker started — listening for jobs on queue 'delivery'");
