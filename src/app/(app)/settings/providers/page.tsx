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
import { SetDefaultButton } from "./set-default-button";

export const metadata = {
  title: "Provider Numbers | Settings | CURA Requests",
};

export default async function ProvidersSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      defaultProviderId: true,
      providers: {
        orderBy: { location: "asc" },
        include: {
          _count: { select: { requests: true } },
        },
      },
    },
  });

  const providers = user?.providers ?? [];
  const defaultProviderId = user?.defaultProviderId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Provider Numbers
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your provider numbers and clinic details. These appear on your imaging request forms.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/providers/new">
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
            Add Provider Number
          </Link>
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="px-0 py-0">
          {providers.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-muted-foreground">
                You haven&apos;t added any provider numbers yet.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Add at least one provider number to start creating imaging requests.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-3">
                <Link href="/settings/providers/new">
                  Add your first provider number
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Clinic</TableHead>
                  <TableHead className="text-xs">Provider No.</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-xs hidden md:table-cell">Fax</TableHead>
                  <TableHead className="text-xs hidden lg:table-cell">Email</TableHead>
                  <TableHead className="text-xs text-right">Requests</TableHead>
                  <TableHead className="text-xs w-[120px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {provider.location}
                          </div>
                          {provider.address && (
                            <div className="text-xs text-muted-foreground mt-0.5 max-w-[250px] truncate">
                              {provider.address}
                            </div>
                          )}
                        </div>
                        {provider.id === defaultProviderId && (
                          <Badge variant="secondary" className="text-[10px]">
                            Default
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-sm font-mono">
                        {provider.providerNumber}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {provider.phone ?? "\u2014"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground font-mono">
                        {provider.fax ?? "\u2014"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {provider.email ?? "\u2014"}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                        {provider._count.requests}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-1">
                        {provider.id !== defaultProviderId && (
                          <SetDefaultButton providerId={provider.id} />
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/settings/providers/${provider.id}/edit`}
                            className="text-xs"
                          >
                            Edit
                          </Link>
                        </Button>
                      </div>
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
