import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { decryptJson } from "@/lib/encryption";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getStatusBadgeVariant, getStatusLabel } from "@/lib/status";
import type { ParsedPhi } from "@/lib/types";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = session.user.role === "admin";

  // Fetch recent requests
  const requests = await prisma.imagingRequest.findMany({
    where: isAdmin ? {} : { createdBy: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      provider: true,
      practice: true,
      deliveryJobs: true,
    },
  });

  // Decrypt patient names
  const requestsWithNames = await Promise.all(
    requests.map(async (req) => {
      let patientName = "Unknown Patient";
      try {
        if (req.parsedPhi) {
          const parsed = await decryptJson<ParsedPhi>(req.parsedPhi as string);
          if (parsed.names && parsed.names.length > 0) {
            patientName = parsed.names[0];
          }
        }
      } catch {
        // Decryption failure — graceful fallback
      }
      return { ...req, patientName };
    })
  );

  // Summary stats — this week
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekFilter = {
    createdAt: { gte: weekStart },
    ...(isAdmin ? {} : { createdBy: session.user.id }),
  };

  const [totalThisWeek, pendingCount, failedCount, failedDeliveryCount] = await Promise.all([
    prisma.imagingRequest.count({ where: weekFilter }),
    prisma.imagingRequest.count({ where: { ...weekFilter, status: "pending" } }),
    prisma.imagingRequest.count({ where: { ...weekFilter, status: "failed" } }),
    prisma.deliveryJob.count({ where: { status: "failed" } }),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "All imaging requests" : "Your imaging requests"} at a glance
          </p>
        </div>
        <Button asChild>
          <Link href="/requests/new">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mr-1"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            New Imaging Request
          </Link>
        </Button>
      </div>

      {/* Failed Delivery Alert */}
      {failedDeliveryCount > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3">
          <div className="flex items-center gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-destructive shrink-0"
            >
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">
                {failedDeliveryCount} delivery job{failedDeliveryCount !== 1 ? "s have" : " has"} failed.{" "}
                <Link
                  href="/requests?status=failed"
                  className="underline underline-offset-2 hover:text-destructive/80"
                >
                  Review in request history
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-foreground">{totalThisWeek}</div>
            <p className="text-xs text-muted-foreground mt-1">requests submitted</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-warning">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-warning">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">awaiting delivery</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-destructive">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-destructive">{failedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Requests Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent Requests</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/requests" className="text-xs text-muted-foreground hover:text-foreground">
                View all
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-1"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          {requestsWithNames.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-muted-foreground">No requests yet</p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link href="/requests/new">Create your first request</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Patient</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Exam</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Practice</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Provider</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestsWithNames.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer">
                    <TableCell className="py-2.5">
                      <Link href={`/requests/${req.id}`} className="block text-xs text-muted-foreground tabular-nums">
                        {req.createdAt.toLocaleDateString("en-AU", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Link href={`/requests/${req.id}`} className="block text-sm font-medium text-foreground">
                        {req.patientName}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <Link href={`/requests/${req.id}`} className="block text-xs text-muted-foreground">
                        {req.examType === "Other" ? req.examOther || "Other" : req.examType}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 hidden lg:table-cell">
                      <Link href={`/requests/${req.id}`} className="block text-xs text-muted-foreground">
                        {req.practice?.name ?? "Manual Entry"}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 hidden lg:table-cell">
                      <Link href={`/requests/${req.id}`} className="block text-xs text-muted-foreground">
                        Dr {req.provider.doctorName}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Link href={`/requests/${req.id}`} className="block">
                        <Badge variant={getStatusBadgeVariant(req.status)} className="text-[10px]">
                          {getStatusLabel(req.status)}
                        </Badge>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
