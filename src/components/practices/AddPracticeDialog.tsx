"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AddPracticeFlow } from "./AddPracticeFlow";
import type { PracticeRecord } from "@/lib/practices/types";

interface AddPracticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (practice: PracticeRecord) => void;
}

export function AddPracticeDialog({
  open,
  onOpenChange,
  onComplete,
}: AddPracticeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Radiology Practice</DialogTitle>
          <DialogDescription>
            Add a new practice to the system. You can enter details manually or
            search online.
          </DialogDescription>
        </DialogHeader>
        <AddPracticeFlow
          onComplete={(practice) => {
            onComplete(practice);
            onOpenChange(false);
          }}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
