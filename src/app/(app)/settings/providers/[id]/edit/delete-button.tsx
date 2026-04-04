"use client";

import { useState } from "react";
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

interface DeleteProviderButtonProps {
  providerNumber: string;
  location: string;
  hasRequests: boolean;
  deleteAction: () => Promise<{ error?: string } | void>;
}

export function DeleteProviderButton({
  providerNumber,
  location,
  hasRequests,
  deleteAction,
}: DeleteProviderButtonProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    const result = await deleteAction();
    if (result && "error" in result) {
      setError(result.error ?? "Failed to delete provider");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={hasRequests}>
          Remove Provider Number
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Provider Number</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove{" "}
            <strong>
              {location} ({providerNumber})
            </strong>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Remove Permanently
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
