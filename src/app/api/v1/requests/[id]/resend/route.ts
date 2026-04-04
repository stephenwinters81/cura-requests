import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { queueDelivery } from "@/lib/queue";
import {
  validateApiKey,
  requireScope,
  apiError,
  apiSuccess,
  withRateLimitHeaders,
  ApiAuthError,
} from "@/lib/api-auth";

// --- POST: Resend Failed Delivery Jobs ---

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "requests:write");

    const { id } = await params;

    // Load request and verify ownership
    const imagingRequest = await prisma.imagingRequest.findUnique({
      where: { id },
      select: {
        id: true,
        createdBy: true,
        pdfPath: true,
        patientEmail: true,
        practice: {
          select: {
            email: true,
            fax: true,
          },
        },
        deliveryJobs: {
          select: {
            id: true,
            type: true,
            status: true,
          },
        },
      },
    });

    if (!imagingRequest || imagingRequest.createdBy !== auth.user.id) {
      return withRateLimitHeaders(
        apiError("NOT_FOUND", "Request not found", 404),
        auth.rateLimit
      );
    }

    // Parse optional body for jobTypes filter
    let jobTypes: string[] | undefined;
    try {
      const body = await request.json();
      if (body.jobTypes && Array.isArray(body.jobTypes)) {
        jobTypes = body.jobTypes;
      }
    } catch {
      // No body or invalid JSON -- resend all failed
    }

    // Find failed jobs
    let failedJobs = imagingRequest.deliveryJobs.filter(
      (j) => j.status === "failed"
    );
    if (jobTypes) {
      failedJobs = failedJobs.filter((j) => jobTypes!.includes(j.type));
    }

    if (failedJobs.length === 0) {
      return withRateLimitHeaders(
        apiSuccess({ requeuedJobs: [] }),
        auth.rateLimit
      );
    }

    // Verify PDF path exists
    if (!imagingRequest.pdfPath) {
      return withRateLimitHeaders(
        apiError("VALIDATION_ERROR", "No PDF available for this request", 422),
        auth.rateLimit
      );
    }

    // Reset failed jobs to queued and enqueue to BullMQ
    const requeuedJobs = await Promise.all(
      failedJobs.map(async (job) => {
        const updated = await prisma.deliveryJob.update({
          where: { id: job.id },
          data: {
            status: "queued",
            attempts: 0,
            lastError: null,
          },
          select: {
            id: true,
            type: true,
            status: true,
          },
        });

        // Derive recipient (same pattern as UI resend)
        let recipient: string;
        switch (job.type) {
          case "provider_email":
            recipient = imagingRequest.practice?.email ?? "";
            break;
          case "provider_fax":
            recipient = imagingRequest.practice?.fax ?? "";
            break;
          case "filing_email":
            recipient = process.env.SMTP_FROM || process.env.SMTP_USER || "filing@curamedical.com.au";
            break;
          case "patient_email":
            recipient = imagingRequest.patientEmail ?? "";
            break;
          default:
            recipient = "";
        }

        if (recipient) {
          await queueDelivery(
            imagingRequest.id,
            job.id,
            job.type as "provider_email" | "provider_fax" | "filing_email" | "patient_email",
            recipient,
            imagingRequest.pdfPath!
          );
        }

        return updated;
      })
    );

    // Audit log
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined;
    await logAudit(
      auth.user.id,
      "request_resent",
      "imaging_request",
      imagingRequest.id,
      `Resent ${requeuedJobs.length} delivery job(s) via API`,
      ip,
      auth.apiKey.id
    );

    const response = apiSuccess({ requeuedJobs });
    return withRateLimitHeaders(response, auth.rateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("POST /api/v1/requests/[id]/resend error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
