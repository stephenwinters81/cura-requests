"use client";

import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { resendDeliveryJob } from "./actions";
import type { DeliveryJobStatus } from "@/lib/types";

// --- Status Badge ---

const statusConfig: Record<
  string,
  { label: string; variant: "success" | "destructive" | "warning" | "default" | "secondary" }
> = {
  delivered: { label: "Delivered", variant: "success" },
  failed: { label: "Failed", variant: "destructive" },
  queued: { label: "Queued", variant: "warning" },
  processing: { label: "Processing", variant: "warning" },
  pending: { label: "Pending", variant: "warning" },
  sent: { label: "Sent", variant: "default" },
  partial: { label: "Partial", variant: "secondary" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

// --- Resend Button ---

function ResendSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      size="sm"
      disabled={pending}
      className="text-xs"
    >
      {pending ? "Resending..." : "Resend"}
    </Button>
  );
}

export function ResendButton({ jobId }: { jobId: string }) {
  return (
    <form action={resendDeliveryJob.bind(null, jobId)}>
      <ResendSubmitButton />
    </form>
  );
}

// --- View PDF Button ---

export function ViewPdfButton({ requestId }: { requestId: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a
        href={`/api/pdf/${requestId}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        View PDF
      </a>
    </Button>
  );
}

// --- Print Button ---

export function PrintButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
    >
      Print
    </Button>
  );
}
