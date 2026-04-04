import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = {
  title: "Radiologists | Admin | CURA Requests",
};

export default async function RadiologistsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const radiologists = await prisma.radiologist.findMany({
    orderBy: { name: "asc" },
    include: {
      practices: { select: { id: true, name: true }, orderBy: { name: "asc" } },
      _count: { select: { requests: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Radiologists
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {radiologists.length} radiologist
            {radiologists.length !== 1 ? "s" : ""} registered. Link them to
            practices so doctors can request specific reporters.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/radiologists/new">
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
            Add Radiologist
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="px-0 py-0">
          {radiologists.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                No radiologists configured yet.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link href="/admin/radiologists/new">
                  Add your first radiologist
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Practices</TableHead>
                  <TableHead className="text-xs text-right">Requests</TableHead>
                  <TableHead className="text-xs w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {radiologists.map((rad) => (
                  <TableRow key={rad.id}>
                    <TableCell className="py-2.5">
                      <span className="text-sm font-medium text-foreground">
                        {rad.name}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {rad.practices.map((p) => (
                          <Badge
                            key={p.id}
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {p.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Badge
                        variant="secondary"
                        className="text-[10px] tabular-nums"
                      >
                        {rad._count.requests}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/admin/radiologists/${rad.id}/edit`}
                          className="text-xs"
                        >
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
