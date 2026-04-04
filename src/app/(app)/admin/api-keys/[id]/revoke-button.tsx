"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revokeApiKey } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

interface RevokeKeyButtonProps {
  apiKeyId: string;
  keyName: string;
}

export function RevokeKeyButton({ apiKeyId, keyName }: RevokeKeyButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    setError(null);
    setRevoking(true);
    try {
      const result = await revokeApiKey(apiKeyId);
      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setRevoking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Revoke API Key
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke API Key</DialogTitle>
          <DialogDescription>
            Are you sure you want to revoke <strong>{keyName}</strong>?
            All API requests using this key will be immediately rejected.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={revoking}>Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
            {revoking ? "Revoking..." : "Revoke Permanently"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
