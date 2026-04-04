"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encryptField, encryptJson } from "@/lib/encryption";
import { logAudit } from "@/lib/audit";
import { imagingRequestSchema } from "@/lib/validation";
import { parsePhi } from "@/lib/phi-parser";
import { orchestrateSubmission } from "@/lib/delivery";
import type { DeliveryMethod } from "@/lib/types";

interface SubmitResult {
  success: boolean;
  requestId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function submitImagingRequest(
  formData: Record<string, unknown>
): Promise<SubmitResult> {
  try {
    // 1. Validate
    const parsed = imagingRequestSchema.safeParse(formData);
    if (!parsed.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        if (!fieldErrors[path]) fieldErrors[path] = [];
        fieldErrors[path].push(issue.message);
      }
      return { success: false, error: "Validation failed", fieldErrors };
    }

    const data = parsed.data;

    // 2. Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Not authenticated" };
    }

    // 3. Validate provider belongs to user (staff only; admins can use any)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, providers: { select: { id: true } } },
    });
    if (user?.role !== "admin") {
      const allowedIds = user?.providers.map((p) => p.id) ?? [];
      if (!allowedIds.includes(data.providerId)) {
        return {
          success: false,
          error: "Validation failed",
          fieldErrors: {
            providerId: ["You do not have access to this provider number"],
          },
        };
      }
    }

    // 4. Parse PHI
    const phiResult = parsePhi(data.rawPhiInput);

    // 4. Encrypt PHI fields
    const encryptedRawPhi = await encryptField(data.rawPhiInput);
    const encryptedParsedPhi = await encryptJson(phiResult);
    const encryptedClinicalDetails = await encryptField(data.clinicalDetails);
    const encryptedPatientEmail = data.patientEmail
      ? await encryptField(data.patientEmail)
      : null;

    // 5. Resolve practice — create from manual entry if needed
    let practiceId = data.practiceId || null;
    let deliveryMethod: DeliveryMethod = "email";

    if (practiceId) {
      const practice = await prisma.radiologyPractice.findUnique({
        where: { id: practiceId },
        select: { email: true, fax: true },
      });
      if (practice) {
        deliveryMethod = practice.email ? "email" : practice.fax ? "fax" : "email";
      }
    } else if (data.manualPractice) {
      // Create a new practice record from manual entry so delivery works
      const newPractice = await prisma.radiologyPractice.create({
        data: {
          name: data.manualPractice.name,
          address: data.manualPractice.address || null,
          phone: data.manualPractice.phone || null,
          fax: data.manualPractice.fax || null,
          email: data.manualPractice.email || null,
        },
      });
      practiceId = newPractice.id;
      deliveryMethod = newPractice.email ? "email" : newPractice.fax ? "fax" : "email";
    }

    // 6. Create imaging request
    const request = await prisma.imagingRequest.create({
      data: {
        practiceId,
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
        sendToPatient: data.sendToPatient,
        deliveryMethod,
        status: "pending",
        createdBy: session.user.id,
      },
    });

    // 7. Update practice usage stats
    if (data.practiceId) {
      await prisma.radiologyPractice.update({
        where: { id: data.practiceId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }

    // 8. Audit log
    await logAudit(
      session.user.id,
      "request_created",
      "imaging_request",
      request.id,
      `Exam: ${data.examType}, Delivery: ${deliveryMethod}`
    );

    // 9. Orchestrate delivery (PDF generation + job queuing)
    try {
      await orchestrateSubmission(request.id);
    } catch (error) {
      console.error("Orchestration failed:", error);
      await prisma.imagingRequest.update({
        where: { id: request.id },
        data: { status: "failed" },
      });
      return {
        success: false,
        error: "Request saved but delivery failed. Please try resending from the request detail page.",
        requestId: request.id,
      };
    }

    return { success: true, requestId: request.id };
  } catch (error) {
    console.error("submitImagingRequest error:", error);
    return { success: false, error: "An unexpected error occurred" };
  }
}

interface DuplicateResult {
  isDuplicate: boolean;
  existingRequestTime?: string;
}

export async function checkDuplicate(
  rawPhiFirstLine: string,
  examType: string
): Promise<DuplicateResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { isDuplicate: false };
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Query recent requests with matching exam type by same user
    const recentRequests = await prisma.imagingRequest.findMany({
      where: {
        createdBy: session.user.id,
        examType,
        createdAt: { gte: twentyFourHoursAgo },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    });

    if (recentRequests.length > 0) {
      return {
        isDuplicate: true,
        existingRequestTime: recentRequests[0].createdAt.toISOString(),
      };
    }

    return { isDuplicate: false };
  } catch {
    return { isDuplicate: false };
  }
}
