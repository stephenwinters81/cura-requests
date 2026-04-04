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

interface Props {
  name: string;
  hasRequests: boolean;
  deleteAction: () => Promise<{ error?: string } | void>;
}

export function DeleteRadiologistButton({
  name,
  hasRequests,
  deleteAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    const result = await deleteAction();
    if (result && "error" in result) {
      setError(result.error ?? "Failed to delete radiologist");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={hasRequests}>
          Delete Radiologist
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Radiologist</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete{" "}
            <strong>{name}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <form action={handleDelete}>
            <Button type="submit" variant="destructive">
              Delete Permanently
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
