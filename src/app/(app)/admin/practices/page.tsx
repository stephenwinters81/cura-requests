import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PracticeSearchInput } from "./search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function PracticesPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const params = await searchParams;
  const search = params.search?.trim() || "";

  const practices = await prisma.radiologyPractice.findMany({
    where: search
      ? { name: { contains: search, mode: "insensitive" } }
      : undefined,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { requests: true } },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Radiology Practices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {practices.length} practice{practices.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/practices/new">
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
            Add Practice
          </Link>
        </Button>
      </div>

      {/* Search */}
      <PracticeSearchInput defaultValue={search} />

      {/* Table */}
      <Card>
        <CardContent className="px-0 py-0">
          {practices.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">No practices configured yet</p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link href="/admin/practices/new">Add your first practice</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Fax</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Phone</TableHead>
                  <TableHead className="text-xs text-right">Requests</TableHead>
                  <TableHead className="text-xs w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {practices.map((practice) => (
                  <TableRow key={practice.id}>
                    <TableCell className="py-2.5">
                      <div className="text-sm font-medium text-foreground">{practice.name}</div>
                      {practice.address && (
                        <div className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">
                          {practice.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{practice.email ?? "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground font-mono">{practice.fax ?? "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">{practice.phone ?? "—"}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                        {practice._count.requests}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/practices/${practice.id}/edit`} className="text-xs">
                          Edit
                        </Link>
                      </Button>
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
