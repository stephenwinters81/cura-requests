/**
 * Shared TypeScript types and constants for the Requests application.
 */

// --- Exam Types (27 items, exactly as specified in PRD) ---

export const EXAM_TYPES = [
  "Other",
  "Non-contrast CT Brain",
  "CT Angiography - Circle of Willis",
  "CT Angiography - Arch to COW",
  "Photon Counting - CT Angiography - Circle of Willis",
  "Photon Counting - CT Angiography - Arch to COW",
  "CT Perfusion",
  "CT Post-contrast Brain",
  "CT Venography - Brain",
  "MRI Brain",
  "MRI Cervical Spine",
  "MRI Lumbar Spine",
  "MRI Whole Spine",
  "MRI Cervical / Thoracic Spine",
  "MRI Cervical / Lumbar Spine",
  "MRI Thoracic / Lumbar Spine",
  "Nerve root injection",
  "Facet joint injection",
  "Epidural injection",
  "Lumbar puncture - IIH",
  "Lumbar puncture - Demyelination",
  "Lumbar puncture - Other",
  "Cerebral angiography",
  "Cerebral venography",
  "Cerebral venography & LP",
  "GA Neurointervention",
  "Conscious Sedation Neurointervention",
] as const;

export type ExamType = (typeof EXAM_TYPES)[number];

// --- Union Types ---

export type DeliveryMethod = "email" | "fax" | "both";

export type RequestStatus = "pending" | "delivered" | "partial" | "failed";

export type DeliveryJobType = "provider_email" | "provider_fax" | "filing_email" | "patient_email";

export type DeliveryJobStatus = "queued" | "processing" | "sent" | "delivered" | "failed";

export type UserRole = "admin" | "staff";

export type ContrastReaction = "yes" | "no";

export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "lockout"
  | "mfa_setup"
  | "request_created"
  | "request_viewed"
  | "request_resent"
  | "practice_created"
  | "practice_updated"
  | "practice_deleted"
  | "user_created"
  | "user_updated"
  | "api_key_created"
  | "api_key_revoked"
  | "api_request"
  | "pdf_generated"
  | "pdf_viewed";

// --- Parsed PHI Interface ---

export interface ParsedPhi {
  names: string[];
  dobs: string[];
  phones: string[];
  medicareNumbers: string[];
  emails: string[];
  addresses: string[];
}

// --- Orchestration Result ---

export interface OrchestrationResult {
  requestId: string;
  jobIds: string[];
  deliveryMethod: DeliveryMethod;
}

// --- Manual Practice (for form fallback) ---

export interface ManualPractice {
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}
