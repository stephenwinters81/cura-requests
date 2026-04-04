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

// --- GET: List Providers ---

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "providers:read");

    // Only return providers linked to the authenticated user
    const providers = await prisma.provider.findMany({
      where: {
        users: { some: { id: auth.user.id } },
      },
      select: {
        id: true,
        doctorName: true,
        providerNumber: true,
        location: true,
      },
      orderBy: { doctorName: "asc" },
    });

    const response = apiSuccess(providers);
    return withRateLimitHeaders(response, auth.rateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("GET /api/v1/providers error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
