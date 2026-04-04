"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUser } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NewUserPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await createUser(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.tempPassword) {
        setTempPassword(result.tempPassword);
        setShowDialog(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopy() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/users" className="hover:text-foreground transition-colors">
          Users
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-foreground">New User</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create User</CardTitle>
          <CardDescription>
            A temporary password will be generated. The user must set up MFA on first login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" name="name" required placeholder="Dr Jane Smith" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input id="email" name="email" type="email" required placeholder="jane@curamedical.com.au" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                name="role"
                required
                defaultValue="staff"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create User"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/users">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Temp Password Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) router.push("/admin/users");
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Share this temporary password with the user. It will only be shown once.
              The user must set up MFA on their first login.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Temporary Password
            </p>
            <p className="text-lg font-mono font-bold text-foreground tracking-wider select-all">
              {tempPassword}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCopy} variant="outline">
              {copied ? "Copied!" : "Copy Password"}
            </Button>
            <Button onClick={() => router.push("/admin/users")}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
