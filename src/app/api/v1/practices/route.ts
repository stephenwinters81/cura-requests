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

// --- GET: List Radiology Practices ---

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "practices:read");

    const url = request.nextUrl;
    const search = url.searchParams.get("search");
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10))
    );

    const where: Record<string, unknown> = {};
    if (search) {
      where.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    const practices = await prisma.radiologyPractice.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        fax: true,
        email: true,
      },
      orderBy: { usageCount: "desc" },
      take: limit,
    });

    const response = apiSuccess(practices);
    return withRateLimitHeaders(response, auth.rateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("GET /api/v1/practices error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
