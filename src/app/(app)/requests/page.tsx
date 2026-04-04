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
import { RequestFilters } from "./filters";
import type { ParsedPhi } from "@/lib/types";

const PAGE_SIZE = 20;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    status?: string;
    providerId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }>;
}

export default async function RequestHistoryPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const isAdmin = session.user.role === "admin";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  // Build filter conditions
  const where: Record<string, unknown> = {};
  if (!isAdmin) where.createdBy = session.user.id;
  if (params.status) where.status = params.status;
  if (params.providerId) where.providerId = params.providerId;
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {
      ...(params.dateFrom ? { gte: new Date(params.dateFrom) } : {}),
      ...(params.dateTo ? { lte: new Date(params.dateTo + "T23:59:59.999Z") } : {}),
    };
  }

  const [totalCount, requests, providers] = await Promise.all([
    prisma.imagingRequest.count({ where }),
    prisma.imagingRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        provider: true,
        practice: true,
      },
    }),
    prisma.provider.findMany({ orderBy: { doctorName: "asc" } }),
  ]);

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

  // Filter by search (patient name) — must be done after decryption
  const searchLower = params.search?.toLowerCase() ?? "";
  const filteredRequests = searchLower
    ? requestsWithNames.filter((r) => r.patientName.toLowerCase().includes(searchLower))
    : requestsWithNames;

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Request History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalCount} total request{totalCount !== 1 ? "s" : ""}
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
            New Request
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <RequestFilters
            providers={providers.map((p) => ({
              id: p.id,
              doctorName: p.doctorName,
              location: p.location,
            }))}
          />
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardContent className="px-0 py-0">
          {filteredRequests.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">No requests match your filters</p>
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
                {filteredRequests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer group">
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
                      <Link href={`/requests/${req.id}`} className="block text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {req.patientName}
                      </Link>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <Link href={`/requests/${req.id}`} className="block text-xs text-muted-foreground max-w-[200px] truncate">
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/requests?${new URLSearchParams({
                      ...params,
                      page: String(page - 1),
                    }).toString()}`}
                  >
                    Previous
                  </Link>
                </Button>
              )}
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/requests?${new URLSearchParams({
                      ...params,
                      page: String(page + 1),
                    }).toString()}`}
                  >
                    Next
                  </Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
