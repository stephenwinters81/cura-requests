import { prisma } from "@/lib/db";
import { getRedisConnection, deliveryQueue } from "@/lib/queue";
import { verifySMTP } from "@/lib/email";
import { verifyNotifyre } from "@/lib/fax";

export interface HealthCheckResult {
  status: "ok" | "error";
  latencyMs?: number;
  error?: string;
}

export interface QueueStats {
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
}

export interface SystemHealthSnapshot {
  database: HealthCheckResult;
  redis: HealthCheckResult;
  smtp: HealthCheckResult;
  notifyre: HealthCheckResult;
  worker: {
    status: "ok" | "stale" | "unknown";
    lastSeenMs: number | null; // ms ago
  };
  queue: QueueStats;
  checkedAt: string;
}

// --- Individual health probes ---

export async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    return { status: "ok", latencyMs: Math.round((performance.now() - start) * 100) / 100 };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "DB unreachable" };
  }
}

export async function checkRedis(): Promise<HealthCheckResult> {
  try {
    const redis = getRedisConnection();
    const start = performance.now();
    await redis.ping();
    return { status: "ok", latencyMs: Math.round((performance.now() - start) * 100) / 100 };
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : "Redis unreachable" };
  }
}

export async function checkSMTP(): Promise<HealthCheckResult> {
  const start = performance.now();
  const result = await verifySMTP();
  const latencyMs = Math.round((performance.now() - start) * 100) / 100;
  if (result.ok) return { status: "ok", latencyMs };
  return { status: "error", error: result.error };
}

export async function checkNotifyreHealth(): Promise<HealthCheckResult> {
  const start = performance.now();
  const result = await verifyNotifyre();
  const latencyMs = Math.round((performance.now() - start) * 100) / 100;
  if (result.ok) return { status: "ok", latencyMs };
  return { status: "error", error: result.error };
}

// --- Worker heartbeat ---

const WORKER_HEARTBEAT_KEY = "requests:worker:heartbeat";
const WORKER_STALE_THRESHOLD_MS = 120_000; // 2 minutes

export async function getWorkerStatus(): Promise<{ status: "ok" | "stale" | "unknown"; lastSeenMs: number | null }> {
  try {
    const redis = getRedisConnection();
    const val = await redis.get(WORKER_HEARTBEAT_KEY);
    if (!val) return { status: "unknown", lastSeenMs: null };

    const ts = parseInt(val, 10);
    const ageMs = Date.now() - ts;
    return {
      status: ageMs < WORKER_STALE_THRESHOLD_MS ? "ok" : "stale",
      lastSeenMs: ageMs,
    };
  } catch {
    return { status: "unknown", lastSeenMs: null };
  }
}

export async function writeWorkerHeartbeat(): Promise<void> {
  try {
    const redis = getRedisConnection();
    await redis.set(WORKER_HEARTBEAT_KEY, Date.now().toString(), "EX", 300);
  } catch {
    // Non-fatal — heartbeat write failure shouldn't crash the worker
  }
}

// --- Queue stats ---

export async function getQueueStats(): Promise<QueueStats> {
  try {
    const [waiting, active, failed, delayed] = await Promise.all([
      deliveryQueue.getWaitingCount(),
      deliveryQueue.getActiveCount(),
      deliveryQueue.getFailedCount(),
      deliveryQueue.getDelayedCount(),
    ]);
    return { waiting, active, failed, delayed };
  } catch {
    return { waiting: 0, active: 0, failed: 0, delayed: 0 };
  }
}

// --- Full snapshot ---

export async function getSystemHealth(): Promise<SystemHealthSnapshot> {
  const [database, redis, smtp, notifyre, worker, queue] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkSMTP(),
    checkNotifyreHealth(),
    getWorkerStatus(),
    getQueueStats(),
  ]);

  return {
    database,
    redis,
    smtp,
    notifyre,
    worker,
    queue,
    checkedAt: new Date().toISOString(),
  };
}
