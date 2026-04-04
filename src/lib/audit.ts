import { prisma } from "@/lib/db";

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
  | "pdf_viewed"
  | "provider_created"
  | "provider_updated"
  | "provider_deleted"
  | "delivery_completed"
  | "delivery_failed"
  | "password_changed"
  | "device_trusted"
  | "device_revoked";

export type ResourceType =
  | "imaging_request"
  | "practice"
  | "user"
  | "api_key"
  | "session"
  | "provider"
  | "trusted_device";

export async function logAudit(
  userId: string | null,
  action: AuditAction,
  resourceType?: ResourceType,
  resourceId?: string,
  details?: string,
  ipAddress?: string,
  apiKeyId?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType: resourceType ?? null,
        resourceId: resourceId ?? null,
        details: details ?? null,
        ipAddress: ipAddress ?? null,
        apiKeyId: apiKeyId ?? null,
      },
    });
  } catch (error) {
    // Never let audit logging break the application flow
    console.error("Failed to write audit log:", error);
  }
}
