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

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/requests/new");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: {
      defaultProvider: true,
    },
  });

  const FAR_FUTURE_THRESHOLD = Date.now() + 365 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/users/new">
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
            Add User
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="px-0 py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs hidden md:table-cell">Email</TableHead>
                <TableHead className="text-xs">Role</TableHead>
                <TableHead className="text-xs hidden md:table-cell">MFA</TableHead>
                <TableHead className="text-xs hidden lg:table-cell">Status</TableHead>
                <TableHead className="text-xs w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const isDeactivated = user.lockedAt && user.lockedAt.getTime() > FAR_FUTURE_THRESHOLD;
                return (
                  <TableRow key={user.id} className={isDeactivated ? "opacity-50" : ""}>
                    <TableCell className="py-2.5">
                      <div className="text-sm font-medium text-foreground">{user.name}</div>
                      <div className="text-xs text-muted-foreground md:hidden mt-0.5">{user.email}</div>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                        className="text-[10px] uppercase tracking-wider"
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      {user.mfaEnabled ? (
                        <Badge variant="success" className="text-[10px]">Enabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Not set up</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 hidden lg:table-cell">
                      {isDeactivated ? (
                        <Badge variant="destructive" className="text-[10px]">Deactivated</Badge>
                      ) : (
                        <Badge variant="success" className="text-[10px]">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/users/${user.id}/edit`} className="text-xs">
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
