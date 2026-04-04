/**
 * Status badge utilities for request and delivery job statuses.
 */

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | "warning";

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  // Request-level statuses
  pending: { label: "Pending", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  partial: { label: "Partial", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
  // Delivery job statuses
  queued: { label: "Queued", variant: "warning" },
  processing: { label: "Processing", variant: "warning" },
  sent: { label: "Sent", variant: "default" },
};

export function getStatusBadgeVariant(status: string): BadgeVariant {
  return STATUS_CONFIG[status]?.variant ?? "secondary";
}

export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label ?? status.charAt(0).toUpperCase() + status.slice(1);
}
