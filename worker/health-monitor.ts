import { checkDatabase, checkRedis, checkSMTP, checkNotifyreHealth, writeWorkerHeartbeat } from "@/lib/health";
import { alertDependencyDown, type AlertDependency } from "@/lib/alerts";

const HEALTH_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export function startHealthMonitor(): void {
  // Write heartbeat immediately on startup
  writeWorkerHeartbeat();

  // Heartbeat every 30 seconds
  setInterval(() => {
    writeWorkerHeartbeat();
  }, HEARTBEAT_INTERVAL_MS);

  // Health checks every 5 minutes
  setInterval(async () => {
    const checks: { dependency: AlertDependency; check: () => Promise<{ status: string; error?: string }> }[] = [
      { dependency: "database", check: checkDatabase },
      { dependency: "redis", check: checkRedis },
      { dependency: "smtp", check: checkSMTP },
      { dependency: "notifyre", check: checkNotifyreHealth },
    ];

    const results = await Promise.allSettled(
      checks.map(async ({ dependency, check }) => {
        const result = await check();
        if (result.status === "error") {
          await alertDependencyDown({ dependency, error: result.error || "Health check failed" });
        }
      })
    );

    // Log any check that threw unexpectedly
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === "rejected") {
        console.error(`Health check for ${checks[i].dependency} threw:`, (results[i] as PromiseRejectedResult).reason);
      }
    }
  }, HEALTH_CHECK_INTERVAL_MS);

  console.log("Health monitor started — heartbeat every 30s, health checks every 5min");
}
