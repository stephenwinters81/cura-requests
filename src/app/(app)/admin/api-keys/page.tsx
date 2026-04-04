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

function getKeyStatus(key: { revokedAt: Date | null; expiresAt: Date | null }): {
  label: string;
  variant: "success" | "destructive" | "warning";
} {
  if (key.revokedAt) return { label: "Revoked", variant: "destructive" };
  if (key.expiresAt && key.expiresAt < new Date()) return { label: "Expired", variant: "warning" };
  return { label: "Active", variant: "success" };
}

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const apiKeys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { name: true, email: true } } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">API Keys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage API keys for Synaptum 8 and external integrations
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/api-keys/new">
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
            Create API Key
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="px-0 py-0">
          {apiKeys.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">No API keys configured</p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link href="/admin/api-keys/new">Create your first API key</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Prefix</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">User</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Scopes</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Last Used</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => {
                  const status = getKeyStatus(key);
                  return (
                    <TableRow key={key.id}>
                      <TableCell className="py-2.5">
                        <div className="text-sm font-medium text-foreground">{key.name}</div>
                      </TableCell>
                      <TableCell className="py-2.5 hidden md:table-cell">
                        <code className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {key.keyPrefix}...
                        </code>
                      </TableCell>
                      <TableCell className="py-2.5 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{key.user.name}</span>
                      </TableCell>
                      <TableCell className="py-2.5 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-[9px] font-mono">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {key.lastUsedAt
                            ? key.lastUsedAt.toLocaleDateString("en-AU", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Never"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Badge variant={status.variant} className="text-[10px]">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/api-keys/${key.id}`} className="text-xs">
                            View
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
