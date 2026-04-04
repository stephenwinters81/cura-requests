import { NextRequest, NextResponse } from "next/server";
import { createDecipheriv } from "crypto";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  validateApiKey,
  requireScope,
  apiError,
  withRateLimitHeaders,
  ApiAuthError,
} from "@/lib/api-auth";

// --- GET: Download PDF ---

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "requests:read");

    const { id } = await params;

    // Load request and verify ownership
    const imagingRequest = await prisma.imagingRequest.findUnique({
      where: { id },
      select: {
        id: true,
        createdBy: true,
        pdfPath: true,
      },
    });

    if (!imagingRequest || imagingRequest.createdBy !== auth.user.id) {
      return withRateLimitHeaders(
        apiError("NOT_FOUND", "Request not found", 404),
        auth.rateLimit
      );
    }

    if (!imagingRequest.pdfPath) {
      return withRateLimitHeaders(
        apiError("NOT_FOUND", "PDF has not been generated yet", 404),
        auth.rateLimit
      );
    }

    // Read encrypted PDF from disk
    const pdfEncryptionKey = process.env.PDF_ENCRYPTION_KEY;
    if (!pdfEncryptionKey) {
      console.error("PDF_ENCRYPTION_KEY not configured");
      return withRateLimitHeaders(
        apiError("INTERNAL_ERROR", "PDF decryption not configured", 500),
        auth.rateLimit
      );
    }

    let pdfBuffer: Buffer;
    try {
      const encryptedData = await readFile(imagingRequest.pdfPath);

      // First 16 bytes are the IV, remainder is the encrypted content
      const iv = encryptedData.subarray(0, 16);
      const encrypted = encryptedData.subarray(16);

      const key = Buffer.from(pdfEncryptionKey, "hex");
      const decipher = createDecipheriv("aes-256-cbc", key, iv);
      pdfBuffer = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch (err) {
      console.error("PDF decryption error:", err);
      return withRateLimitHeaders(
        apiError("INTERNAL_ERROR", "Failed to read PDF", 500),
        auth.rateLimit
      );
    }

    // Audit log
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined;
    await logAudit(
      auth.user.id,
      "pdf_viewed",
      "imaging_request",
      imagingRequest.id,
      "PDF downloaded via API",
      ip,
      auth.apiKey.id
    );

    // Return binary PDF
    const response = new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="request-${id}.pdf"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    response.headers.set(
      "X-RateLimit-Limit",
      String(auth.rateLimit.limit)
    );
    response.headers.set(
      "X-RateLimit-Remaining",
      String(auth.rateLimit.remaining)
    );
    response.headers.set(
      "X-RateLimit-Reset",
      String(auth.rateLimit.reset)
    );

    return response;
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("GET /api/v1/requests/[id]/pdf error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
