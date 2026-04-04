import { NextRequest, NextResponse } from "next/server";
import { Queue } from "bullmq";
import { getRedisConnection } from "@/lib/queue";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Optional token auth for health check
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (token) {
    const authHeader = request.headers.get("authorization");
    const providedToken = authHeader?.replace("Bearer ", "");
    if (providedToken !== token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const connection = getRedisConnection();

    // Verify Redis connectivity
    await connection.ping();

    // Create a temporary Queue instance to read stats
    const queue = new Queue("delivery", { connection });

    const [waiting, active, delayed, failed, completed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount(),
      queue.getCompletedCount(),
    ]);

    // Get completed count from last 24 hours (approximate via completed jobs list)
    let completedLast24h = 0;
    try {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const completedJobs = await queue.getCompleted(0, 500);
      completedLast24h = completedJobs.filter(
        (job) => job.finishedOn && job.finishedOn >= oneDayAgo
      ).length;
    } catch {
      // If we can't get detailed completed info, use total count
      completedLast24h = completed;
    }

    // Determine overall status
    let status: "ok" | "degraded" | "error" = "ok";
    if (failed > 0) {
      status = "degraded";
    }

    await queue.close();

    return NextResponse.json({
      status,
      timestamp: new Date().toISOString(),
      queue: {
        name: "delivery",
        waiting,
        active,
        completedLast24h,
        failed,
        delayed,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Failed to connect to queue",
      },
      { status: 503 }
    );
  }
}
