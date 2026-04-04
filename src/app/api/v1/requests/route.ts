import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { encryptField, encryptJson } from "@/lib/encryption";
import { imagingRequestSchema } from "@/lib/validation";
import { parsePhi } from "@/lib/phi-parser";
import { EXAM_TYPES } from "@/lib/types";
import {
  validateApiKey,
  requireScope,
  checkCreateRateLimit,
  apiError,
  apiSuccess,
  withRateLimitHeaders,
  sanitizeRequest,
  ApiAuthError,
} from "@/lib/api-auth";
import { orchestrateSubmission } from "@/lib/delivery";

// --- POST: Create Imaging Request ---

export async function POST(request: NextRequest) {
  try {
    // Auth
    const auth = await validateApiKey(request);
    requireScope(auth, "requests:write");

    // Create-specific rate limit (30 req/min)
    const createRateLimit = await checkCreateRateLimit(auth.apiKey.id);

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return withRateLimitHeaders(
        apiError("VALIDATION_ERROR", "Invalid JSON body", 422),
        createRateLimit
      );
    }

    // Validate with Zod
    const parsed = imagingRequestSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
      return withRateLimitHeaders(
        apiError("VALIDATION_ERROR", "Request validation failed", 422, details),
        createRateLimit
      );
    }

    const data = parsed.data;

    // Validate practiceId exists (if provided)
    if (data.practiceId) {
      const practice = await prisma.radiologyPractice.findUnique({
        where: { id: data.practiceId },
      });
      if (!practice) {
        return withRateLimitHeaders(
          apiError("VALIDATION_ERROR", "Practice not found", 422, [
            { path: "practiceId", message: "Practice ID does not exist" },
          ]),
          createRateLimit
        );
      }
    }

    // Validate providerId exists and belongs to the user
    const provider = await prisma.provider.findUnique({
      where: { id: data.providerId },
      include: { users: { where: { id: auth.user.id }, select: { id: true } } },
    });
    if (!provider) {
      return withRateLimitHeaders(
        apiError("VALIDATION_ERROR", "Provider not found", 422, [
          { path: "providerId", message: "Provider ID does not exist" },
        ]),
        createRateLimit
      );
    }
    if (provider.users.length === 0) {
      return withRateLimitHeaders(
        apiError("AUTHORIZATION_ERROR", "Provider does not belong to this user", 403, [
          { path: "providerId", message: "You do not have access to this provider number" },
        ]),
        createRateLimit
      );
    }

    // Validate examType
    if (
      !EXAM_TYPES.includes(data.examType as (typeof EXAM_TYPES)[number])
    ) {
      return withRateLimitHeaders(
        apiError("VALIDATION_ERROR", "Invalid exam type", 422, [
          { path: "examType", message: "Exam type is not valid" },
        ]),
        createRateLimit
      );
    }

    // Duplicate detection: same examType + providerId + createdBy within 24h
    // NOTE: force:true bypass is intentionally NOT available via the API.
    // The web UI has a confirmation dialog for duplicates; the API must always
    // return 409 so the caller can decide how to handle it.
    {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const duplicate = await prisma.imagingRequest.findFirst({
        where: {
          examType: data.examType,
          providerId: data.providerId,
          createdBy: auth.user.id,
          createdAt: { gte: twentyFourHoursAgo },
        },
        select: { id: true },
      });
      if (duplicate) {
        return withRateLimitHeaders(
          apiError(
            "DUPLICATE_REQUEST",
            "A similar request was created in the last 24 hours.",
            409,
            { existingRequestId: duplicate.id }
          ),
          createRateLimit
        );
      }
    }

    // Encrypt PHI — parse raw input into structured entities first
    const encryptedRawPhi = await encryptField(data.rawPhiInput);
    const parsedPhi = parsePhi(data.rawPhiInput);
    const encryptedParsedPhi = await encryptJson(parsedPhi);
    const encryptedClinicalDetails = await encryptField(data.clinicalDetails);
    const encryptedPatientEmail = data.patientEmail
      ? await encryptField(data.patientEmail)
      : null;

    // Determine delivery method — email first, fax only if no email available
    let deliveryMethod = data.deliveryMethod;
    if (!deliveryMethod && data.practiceId) {
      const practice = await prisma.radiologyPractice.findUnique({
        where: { id: data.practiceId },
        select: { email: true, fax: true },
      });
      deliveryMethod = practice?.email ? "email" : practice?.fax ? "fax" : "email";
    }
    if (!deliveryMethod) {
      deliveryMethod = "email";
    }

    // Create the request
    const imagingRequest = await prisma.imagingRequest.create({
      data: {
        practiceId: data.practiceId || null,
        rawPhiInput: encryptedRawPhi,
        parsedPhi: encryptedParsedPhi,
        examType: data.examType,
        examOther: data.examOther || null,
        clinicalDetails: encryptedClinicalDetails,
        contrastReaction: data.contrastReaction,
        egfr: data.egfr || null,
        providerId: data.providerId,
        reportByRadiologistId: data.reportByRadiologistId || null,
        patientEmail: encryptedPatientEmail,
        sendToPatient: data.sendToPatient ?? false,
        deliveryMethod,
        status: "pending",
        createdBy: auth.user.id,
      },
      include: {
        deliveryJobs: true,
      },
    });

    // Update practice usage count (fire-and-forget)
    if (data.practiceId) {
      prisma.radiologyPractice
        .update({
          where: { id: data.practiceId },
          data: {
            usageCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        })
        .catch(() => {});
    }

    // Audit log
    await logAudit(
      auth.user.id,
      "request_created",
      "imaging_request",
      imagingRequest.id,
      `API request created: ${data.examType}`,
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || undefined,
      auth.apiKey.id
    );

    // Orchestrate delivery (PDF generation + job queuing)
    try {
      await orchestrateSubmission(imagingRequest.id);
    } catch (error) {
      console.error("Orchestration failed for API request:", error);
      await prisma.imagingRequest.update({
        where: { id: imagingRequest.id },
        data: { status: "failed" },
      });
    }

    // Reload with delivery jobs populated after orchestration
    const reloaded = await prisma.imagingRequest.findUniqueOrThrow({
      where: { id: imagingRequest.id },
      include: { deliveryJobs: true },
    });

    // Return sanitized response (no PHI)
    const response = apiSuccess(
      {
        id: reloaded.id,
        status: reloaded.status,
        examType: reloaded.examType,
        providerId: reloaded.providerId,
        practiceId: reloaded.practiceId,
        deliveryMethod: reloaded.deliveryMethod,
        sendToPatient: reloaded.sendToPatient,
        pdfGenerated: !!reloaded.pdfPath,
        deliveryJobs: reloaded.deliveryJobs.map((j) => ({
          id: j.id,
          type: j.type,
          status: j.status,
        })),
        createdAt: reloaded.createdAt.toISOString(),
      },
      201
    );

    return withRateLimitHeaders(response, createRateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("POST /api/v1/requests error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}

// --- GET: List Requests ---

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "requests:read");

    const url = request.nextUrl;
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, parseInt(url.searchParams.get("limit") || "20", 10))
    );
    const status = url.searchParams.get("status");
    const providerId = url.searchParams.get("providerId");
    const since = url.searchParams.get("since");
    const until = url.searchParams.get("until");

    // Build filters
    const where: Record<string, unknown> = {
      createdBy: auth.user.id,
    };

    if (status) where.status = status;
    if (providerId) where.providerId = providerId;
    if (since || until) {
      const createdAt: Record<string, Date> = {};
      if (since) createdAt.gte = new Date(since);
      if (until) createdAt.lte = new Date(until);
      where.createdAt = createdAt;
    }

    const [items, total] = await Promise.all([
      prisma.imagingRequest.findMany({
        where,
        select: {
          id: true,
          status: true,
          examType: true,
          providerId: true,
          practiceId: true,
          deliveryMethod: true,
          sendToPatient: true,
          reportByRadiologistId: true,
          createdBy: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.imagingRequest.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const response = apiSuccess({
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });

    return withRateLimitHeaders(response, auth.rateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("GET /api/v1/requests error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
