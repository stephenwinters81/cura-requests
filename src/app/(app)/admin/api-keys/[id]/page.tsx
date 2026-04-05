import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RevokeKeyButton } from "./revoke-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApiKeyDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/requests/new");

  const { id } = await params;
  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!apiKey) notFound();

  const isRevoked = !!apiKey.revokedAt;
  const isExpired = apiKey.expiresAt ? apiKey.expiresAt < new Date() : false;
  const statusLabel = isRevoked ? "Revoked" : isExpired ? "Expired" : "Active";
  const statusVariant = isRevoked ? "destructive" : isExpired ? "warning" : "success";

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/api-keys" className="hover:text-foreground transition-colors">
          API Keys
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-foreground">{apiKey.name}</span>
      </div>

      {/* Key Details */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">{apiKey.name}</CardTitle>
              <CardDescription className="mt-1">
                Created {apiKey.createdAt.toLocaleDateString("en-AU", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </CardDescription>
            </div>
            <Badge variant={statusVariant as "success" | "destructive" | "warning"} className="text-[10px]">
              {statusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Key Prefix */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Key Prefix
            </p>
            <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{apiKey.keyPrefix}...</code>
          </div>

          <Separator />

          {/* Acting-As User */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Acting-As User
            </p>
            <p className="text-sm text-foreground">{apiKey.user.name} ({apiKey.user.email})</p>
          </div>

          <Separator />

          {/* Scopes */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Scopes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {apiKey.scopes.map((scope) => (
                <Badge key={scope} variant="secondary" className="text-[10px] font-mono">
                  {scope}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Webhook */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Webhook URL
            </p>
            {apiKey.webhookUrl ? (
              <code className="text-xs font-mono text-foreground break-all">{apiKey.webhookUrl}</code>
            ) : (
              <p className="text-xs text-muted-foreground">Not configured</p>
            )}
          </div>

          <Separator />

          {/* Allowed IPs */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Allowed IPs
            </p>
            {apiKey.allowedIps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {apiKey.allowedIps.map((ip) => (
                  <Badge key={ip} variant="outline" className="text-[10px] font-mono">
                    {ip}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Any IP allowed</p>
            )}
          </div>

          <Separator />

          {/* Dates */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Created
              </p>
              <p className="text-xs text-foreground tabular-nums">
                {apiKey.createdAt.toLocaleDateString("en-AU")}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Last Used
              </p>
              <p className="text-xs text-foreground tabular-nums">
                {apiKey.lastUsedAt
                  ? apiKey.lastUsedAt.toLocaleDateString("en-AU")
                  : "Never"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Expires
              </p>
              <p className="text-xs text-foreground tabular-nums">
                {apiKey.expiresAt
                  ? apiKey.expiresAt.toLocaleDateString("en-AU")
                  : "Never"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revoke */}
      {!isRevoked && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base text-destructive">Revoke API Key</CardTitle>
            <CardDescription>
              Revoking this key will immediately prevent all API requests using it.
              This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RevokeKeyButton apiKeyId={apiKey.id} keyName={apiKey.name} />
          </CardContent>
        </Card>
      )}

      {isRevoked && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">
              This key was revoked on{" "}
              {apiKey.revokedAt!.toLocaleDateString("en-AU", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
              . It can no longer be used for API requests.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
