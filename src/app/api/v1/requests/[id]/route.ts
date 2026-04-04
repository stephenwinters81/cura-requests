import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  validateApiKey,
  requireScope,
  apiError,
  apiSuccess,
  withRateLimitHeaders,
  ApiAuthError,
} from "@/lib/api-auth";

// --- GET: Get Request by ID ---

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "requests:read");

    const { id } = await params;

    const imagingRequest = await prisma.imagingRequest.findUnique({
      where: { id },
      include: {
        provider: {
          select: {
            doctorName: true,
            providerNumber: true,
          },
        },
        practice: {
          select: {
            name: true,
          },
        },
        deliveryJobs: {
          select: {
            id: true,
            type: true,
            status: true,
            attempts: true,
            lastError: true,
            confirmedAt: true,
          },
        },
      },
    });

    // Return 404 if not found or not owned by this user
    if (!imagingRequest || imagingRequest.createdBy !== auth.user.id) {
      return withRateLimitHeaders(
        apiError("NOT_FOUND", "Request not found", 404),
        auth.rateLimit
      );
    }

    // Sanitized response (no PHI)
    const response = apiSuccess({
      id: imagingRequest.id,
      status: imagingRequest.status,
      examType: imagingRequest.examType,
      providerId: imagingRequest.providerId,
      providerName: imagingRequest.provider.doctorName,
      providerNumber: imagingRequest.provider.providerNumber,
      practiceId: imagingRequest.practiceId,
      practiceName: imagingRequest.practice?.name || null,
      deliveryMethod: imagingRequest.deliveryMethod,
      sendToPatient: imagingRequest.sendToPatient,
      reportByRadiologistId: imagingRequest.reportByRadiologistId,
      createdBy: imagingRequest.createdBy,
      createdAt: imagingRequest.createdAt.toISOString(),
      deliveryJobs: imagingRequest.deliveryJobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        attempts: j.attempts,
        lastError: j.lastError,
        confirmedAt: j.confirmedAt?.toISOString() || null,
      })),
    });

    return withRateLimitHeaders(response, auth.rateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("GET /api/v1/requests/[id] error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
