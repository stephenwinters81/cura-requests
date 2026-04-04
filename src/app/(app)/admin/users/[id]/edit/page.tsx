"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { updateUser, resetPassword, toggleUserActive } from "../../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  mfaEnabled: boolean;
  lockedAt: string | null;
  createdAt: string;
}

export default function EditUserPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset password dialog
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetTempPassword, setResetTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load user");
        return res.json();
      })
      .then((data) => {
        setUser(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load user data");
        setLoading(false);
      });
  }, [userId]);

  async function handleUpdate(formData: FormData) {
    setError(null);
    setSubmitting(true);
    try {
      const result = await updateUser(userId, formData);
      if (result?.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    const result = await resetPassword(userId);
    if (result.error) {
      setError(result.error);
    } else if (result.tempPassword) {
      setResetTempPassword(result.tempPassword);
      setShowResetDialog(true);
    }
  }

  async function handleToggleActive() {
    const result = await toggleUserActive(userId);
    if (result?.error) {
      setError(result.error);
    } else {
      // Refresh user data
      router.refresh();
    }
  }

  function handleCopy() {
    if (resetTempPassword) {
      navigator.clipboard.writeText(resetTempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading user...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">{error ?? "User not found"}</p>
      </div>
    );
  }

  const FAR_FUTURE_THRESHOLD = Date.now() + 365 * 24 * 60 * 60 * 1000;
  const isDeactivated = user.lockedAt && new Date(user.lockedAt).getTime() > FAR_FUTURE_THRESHOLD;

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
        <span className="text-foreground">{user.name}</span>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Edit User</CardTitle>
              <CardDescription className="mt-1">{user.email}</CardDescription>
            </div>
            <div className="flex gap-2">
              {user.mfaEnabled ? (
                <Badge variant="success" className="text-[10px]">MFA Enabled</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">No MFA</Badge>
              )}
              {isDeactivated && (
                <Badge variant="destructive" className="text-[10px]">Deactivated</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form action={handleUpdate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" name="name" required defaultValue={user.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                name="role"
                required
                defaultValue={user.role}
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
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/users">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Reset Password</p>
              <p className="text-xs text-muted-foreground">Generate a new temporary password. MFA will be cleared.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleResetPassword}>
              Reset Password
            </Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{isDeactivated ? "Reactivate Account" : "Deactivate Account"}</p>
              <p className="text-xs text-muted-foreground">
                {isDeactivated
                  ? "Allow this user to log in again."
                  : "Prevent this user from logging in."}
              </p>
            </div>
            <Button
              variant={isDeactivated ? "default" : "destructive"}
              size="sm"
              onClick={handleToggleActive}
            >
              {isDeactivated ? "Reactivate" : "Deactivate"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
            <DialogDescription>
              Share this temporary password with the user. It will only be shown once.
              MFA has been cleared and must be set up again on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              New Temporary Password
            </p>
            <p className="text-lg font-mono font-bold text-foreground tracking-wider select-all">
              {resetTempPassword}
            </p>
          </div>
          <DialogFooter>
            <Button onClick={handleCopy} variant="outline">
              {copied ? "Copied!" : "Copy Password"}
            </Button>
            <Button onClick={() => setShowResetDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
