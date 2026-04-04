import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import Redis from "ioredis";

// --- Types ---

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ApiAuthResult {
  user: { id: string; email: string; name: string; role: string };
  apiKey: {
    id: string;
    name: string;
    keyPrefix: string;
    webhookUrl: string | null;
    webhookSecret: string | null;
  };
  scopes: string[];
  rateLimit: RateLimitInfo;
}

// --- Error Class ---

export class ApiAuthError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, statusCode: number, message: string) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = "ApiAuthError";
  }

  toResponse(): NextResponse {
    return apiError(this.code, this.message, this.statusCode);
  }
}

// --- Redis (lazy, fail-open) ---

let redisInstance: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!redisInstance) {
    try {
      redisInstance = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
      });
      redisInstance.on("error", () => {
        // Fail open: swallow Redis errors
      });
      redisInstance.connect().catch(() => {});
    } catch {
      redisInstance = null;
    }
  }
  return redisInstance;
}

// --- Rate Limiting (sliding window) ---

async function checkRateLimit(
  keyId: string,
  scope: string,
  limit: number
): Promise<RateLimitInfo> {
  const redis = getRedis();
  const windowMs = 60_000;
  const now = Date.now();
  const reset = Math.ceil((now + windowMs) / 1000);

  if (!redis) {
    // Fail open if Redis unavailable
    return { limit, remaining: limit, reset };
  }

  const redisKey = `ratelimit:${scope}:${keyId}`;
  const windowStart = now - windowMs;

  try {
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(redisKey, 0, windowStart);
    pipeline.zadd(redisKey, now.toString(), `${now}:${Math.random()}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, 120);
    const results = await pipeline.exec();

    const count = (results?.[2]?.[1] as number) ?? 0;
    const remaining = Math.max(0, limit - count);

    if (count > limit) {
      throw new ApiAuthError(
        "RATE_LIMITED",
        429,
        `Rate limit exceeded. Limit: ${limit} requests per minute.`
      );
    }

    return { limit, remaining, reset };
  } catch (err) {
    if (err instanceof ApiAuthError) throw err;
    // Fail open on Redis errors
    return { limit, remaining: limit, reset };
  }
}

// --- IP Extraction ---

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// --- Core Auth ---

export async function validateApiKey(
  request: NextRequest
): Promise<ApiAuthResult> {
  // 1. Extract Bearer token
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new ApiAuthError(
      "UNAUTHORIZED",
      401,
      "Missing or invalid Authorization header. Expected: Bearer <api_key>"
    );
  }

  const token = authHeader.slice(7);
  if (!token || token.length < 10) {
    throw new ApiAuthError("UNAUTHORIZED", 401, "Invalid API key format");
  }

  // 2. SHA-256 hash
  const keyHash = createHash("sha256").update(token).digest("hex");

  // 3. Lookup
  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
    include: { user: true },
  });

  if (!apiKey) {
    throw new ApiAuthError("UNAUTHORIZED", 401, "Invalid API key");
  }

  // 4. Check revoked
  if (apiKey.revokedAt) {
    throw new ApiAuthError("UNAUTHORIZED", 401, "API key has been revoked");
  }

  // 4b. Check expired
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new ApiAuthError("UNAUTHORIZED", 401, "API key has expired");
  }

  // 4c. Check allowed IPs
  if (apiKey.allowedIps.length > 0) {
    const clientIp = getClientIp(request);
    if (!apiKey.allowedIps.includes(clientIp)) {
      throw new ApiAuthError(
        "FORBIDDEN",
        403,
        "Request from unauthorized IP address"
      );
    }
  }

  // 5. Rate limit (general: 120/min)
  const rateLimit = await checkRateLimit(apiKey.id, "general", 120);

  // 6. Update lastUsedAt (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  // 7. Audit log
  const ip = getClientIp(request);
  logAudit(
    apiKey.userId,
    "api_request",
    undefined,
    undefined,
    `${request.method} ${request.nextUrl.pathname}`,
    ip,
    apiKey.id
  ).catch(() => {});

  // 8. Return result
  return {
    user: {
      id: apiKey.user.id,
      email: apiKey.user.email,
      name: apiKey.user.name,
      role: apiKey.user.role,
    },
    apiKey: {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      webhookUrl: apiKey.webhookUrl,
      webhookSecret: apiKey.webhookSecret,
    },
    scopes: apiKey.scopes,
    rateLimit,
  };
}

// --- Create Rate Limit (30 req/min) ---

export async function checkCreateRateLimit(
  keyId: string
): Promise<RateLimitInfo> {
  return checkRateLimit(keyId, "create", 30);
}

// --- Scope Check ---

export function requireScope(auth: ApiAuthResult, scope: string): void {
  if (!auth.scopes.includes(scope)) {
    throw new ApiAuthError(
      "FORBIDDEN",
      403,
      `API key lacks required scope: ${scope}`
    );
  }
}

// --- Response Helpers ---

export function apiError(
  code: string,
  message: string,
  status: number,
  details?: unknown
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status }
  );
}

export function apiSuccess(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json({ ok: true, data }, { status });
}

export function withRateLimitHeaders(
  response: NextResponse,
  rateLimit: RateLimitInfo
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
  response.headers.set("X-RateLimit-Reset", String(rateLimit.reset));
  return response;
}

// --- Sanitize Request (strip PHI from response objects) ---

export function sanitizeRequest(request: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...request };
  delete sanitized.rawPhiInput;
  delete sanitized.parsedPhi;
  delete sanitized.patientEmail;
  delete sanitized.pdfPath;
  return sanitized;
}
