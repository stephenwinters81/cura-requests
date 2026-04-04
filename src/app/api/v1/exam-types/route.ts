import { NextRequest } from "next/server";
import { EXAM_TYPES } from "@/lib/types";
import {
  validateApiKey,
  requireScope,
  apiError,
  apiSuccess,
  withRateLimitHeaders,
  ApiAuthError,
} from "@/lib/api-auth";

// --- GET: List Exam Types ---

export async function GET(request: NextRequest) {
  try {
    const auth = await validateApiKey(request);
    requireScope(auth, "providers:read");

    const response = apiSuccess([...EXAM_TYPES]);
    return withRateLimitHeaders(response, auth.rateLimit);
  } catch (err) {
    if (err instanceof ApiAuthError) {
      return err.toResponse();
    }
    console.error("GET /api/v1/exam-types error:", err);
    return apiError("INTERNAL_ERROR", "Internal server error", 500);
  }
}
