import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSystemHealth } from "@/lib/health";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RetryAllButton } from "./retry-all-button";

export const metadata: Metadata = { title: "System Health" };
export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: "ok" | "error" | "stale" | "unknown" }) {
  const variant =
    status === "ok" ? "success" :
    status === "error" ? "destructive" :
    status === "stale" ? "warning" :
    "secondary";
  const label =
    status === "ok" ? "Healthy" :
    status === "error" ? "Error" :
    status === "stale" ? "Stale" :
    "Unknown";
  return <Badge variant={variant}>{label}</Badge>;
}

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return "—";
  return `${ms}ms`;
}

function formatAge(ms: number | null): string {
  if (ms === null) return "Never seen";
  if (ms < 1000) return "Just now";
  if (ms < 60_000) return `${Math.round(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export default async function SystemHealthPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const [health, failedJobs] = await Promise.all([
    getSystemHealth(),
    prisma.deliveryJob.findMany({
      where: { status: "failed" },
      orderBy: { updatedAt: "desc" },
      take: 25,
      include: {
        request: {
          select: { id: true, examType: true, createdAt: true },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">System Health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dependency status, queue depth, and failed delivery history
        </p>
      </div>

      {/* Dependency Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <StatusBadge status={health.database.status} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatMs(health.database.latencyMs)}
              </span>
            </div>
            {health.database.error && (
              <p className="text-xs text-destructive mt-2 truncate" title={health.database.error}>
                {health.database.error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Redis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <StatusBadge status={health.redis.status} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatMs(health.redis.latencyMs)}
              </span>
            </div>
            {health.redis.error && (
              <p className="text-xs text-destructive mt-2 truncate" title={health.redis.error}>
                {health.redis.error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SMTP (Gmail)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <StatusBadge status={health.smtp.status} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatMs(health.smtp.latencyMs)}
              </span>
            </div>
            {health.smtp.error && (
              <p className="text-xs text-destructive mt-2 truncate" title={health.smtp.error}>
                {health.smtp.error}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Notifyre (Fax/SMS)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <StatusBadge status={health.notifyre.status} />
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatMs(health.notifyre.latencyMs)}
              </span>
            </div>
            {health.notifyre.error && (
              <p className="text-xs text-destructive mt-2 truncate" title={health.notifyre.error}>
                {health.notifyre.error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Worker + Queue Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Delivery Worker
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <StatusBadge status={health.worker.status} />
              <span className="text-xs text-muted-foreground">
                {formatAge(health.worker.lastSeenMs)}
              </span>
            </div>
            {health.worker.status === "stale" && (
              <p className="text-xs text-warning mt-2">
                Worker has not sent a heartbeat recently. It may have crashed or been stopped.
              </p>
            )}
            {health.worker.status === "unknown" && (
              <p className="text-xs text-muted-foreground mt-2">
                No heartbeat recorded yet. The worker may not have started.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Queue Depth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <div className="text-lg font-bold tabular-nums">{health.queue.waiting}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Waiting</div>
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums">{health.queue.active}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Active</div>
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums">{health.queue.delayed}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Delayed</div>
              </div>
              <div>
                <div className="text-lg font-bold tabular-nums text-destructive">{health.queue.failed}</div>
                <div className="text-[10px] text-muted-foreground uppercase">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Failed Jobs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Failed Delivery Jobs
              {failedJobs.length > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({failedJobs.length})
                </span>
              )}
            </CardTitle>
            {failedJobs.length > 0 && <RetryAllButton count={failedJobs.length} />}
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {failedJobs.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-muted-foreground">No failed delivery jobs</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Exam</TableHead>
                  <TableHead className="text-xs">Attempts</TableHead>
                  <TableHead className="text-xs">Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="py-2.5 text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {job.updatedAt.toLocaleDateString("en-AU", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      {job.updatedAt.toLocaleTimeString("en-AU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="text-[10px]">
                        {job.type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell text-xs text-muted-foreground">
                      {job.request.examType}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs tabular-nums text-center">
                      {job.attempts}
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-destructive max-w-[200px] truncate" title={job.lastError || undefined}>
                      {job.lastError || "Unknown error"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Checked at timestamp */}
      <p className="text-xs text-muted-foreground text-center">
        Health checked at {new Date(health.checkedAt).toLocaleTimeString("en-AU")}. Refresh the page for updated status.
      </p>
    </div>
  );
}
