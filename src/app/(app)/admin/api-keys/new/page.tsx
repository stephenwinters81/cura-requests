"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createApiKey } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SCOPES = [
  { value: "requests:write", label: "Create Requests", description: "Submit new imaging requests" },
  { value: "requests:read", label: "Read Requests", description: "View request status and metadata" },
  { value: "practices:read", label: "Read Practices", description: "List radiology practices" },
  { value: "providers:read", label: "Read Providers", description: "List referring providers" },
] as const;

interface UserOption {
  id: string;
  name: string;
  email: string;
}

export default function NewApiKeyPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["requests:write", "requests:read"]);

  useEffect(() => {
    fetch("/api/admin/users-list")
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch(() => {});
  }, []);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    // Add scopes to formData
    selectedScopes.forEach((scope) => formData.append("scopes", scope));
    try {
      const result = await createApiKey(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.fullKey) {
        setFullKey(result.fullKey);
        setShowDialog(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (fullKey) {
      navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function toggleScope(scope: string) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

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
        <span className="text-foreground">New API Key</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create API Key</CardTitle>
          <CardDescription>
            The full API key will be shown only once after creation. Store it securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Key Name *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Synaptum 8 Production"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">Acting-As User *</Label>
              <select
                id="userId"
                name="userId"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Select a user...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                API requests will be attributed to this user in the audit trail.
              </p>
            </div>

            {/* Scopes */}
            <div className="space-y-3">
              <Label>Scopes *</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {SCOPES.map((scope) => (
                  <label
                    key={scope.value}
                    className="flex items-start gap-3 rounded-lg border border-input p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedScopes.includes(scope.value)}
                      onCheckedChange={() => toggleScope(scope.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium">{scope.label}</p>
                      <p className="text-[11px] text-muted-foreground">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Webhook URL</Label>
              <Input
                id="webhookUrl"
                name="webhookUrl"
                type="url"
                placeholder="https://your-app.com/webhooks/requests"
              />
              <p className="text-[11px] text-muted-foreground">
                Delivery status updates will be POSTed here (HMAC-SHA256 signed).
              </p>
            </div>

            {/* Allowed IPs */}
            <div className="space-y-2">
              <Label htmlFor="allowedIps">Allowed IP Addresses</Label>
              <Textarea
                id="allowedIps"
                name="allowedIps"
                placeholder="One IP per line, e.g.&#10;203.0.113.1&#10;203.0.113.2"
                rows={3}
              />
              <p className="text-[11px] text-muted-foreground">
                Leave blank to allow from any IP. Comma or newline separated.
              </p>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiry Date</Label>
              <Input
                id="expiresAt"
                name="expiresAt"
                type="datetime-local"
              />
              <p className="text-[11px] text-muted-foreground">
                Leave blank for no expiry. Expired keys are automatically rejected.
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting || selectedScopes.length === 0}>
                {submitting ? "Creating..." : "Create API Key"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/api-keys">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Full Key Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) router.push("/admin/api-keys");
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. It will never be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              API Key
            </p>
            <p className="text-sm font-mono font-bold text-foreground break-all select-all leading-relaxed">
              {fullKey}
            </p>
          </div>
          <div className="rounded-md bg-warning/10 border border-warning/20 p-3">
            <p className="text-xs text-warning-foreground">
              Store this key in a secure location. For security, only the prefix will be visible after this dialog is closed.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCopy} variant="outline">
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <Button onClick={() => router.push("/admin/api-keys")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
