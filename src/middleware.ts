/**
 * CSRF Protection Strategy
 *
 * This application does NOT use explicit CSRF tokens. Protection is achieved through:
 *
 * 1. Auth.js handles CSRF for its own routes (login, callback, signout) via
 *    built-in double-submit cookie verification.
 * 2. Next.js server actions use SameSite cookie protection — session cookies are
 *    set with SameSite=Lax (Auth.js default), preventing cross-origin POST
 *    requests from carrying credentials.
 * 3. CSP form-action 'self' (set below) prevents cross-origin form submissions
 *    from this page, blocking form-based CSRF vectors.
 * 4. The REST API (/api/v1/) uses Bearer token auth (not cookies), which is
 *    inherently immune to CSRF.
 *
 * For this architecture (JWT + SameSite cookies + server actions + CSP),
 * explicit CSRF tokens are not required. Accepted risk reviewed by Pentarchy
 * security council.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// --- Rate Limiting (in-memory, best-effort) ---
// Primary brute-force protection is DB-level account lockout (auth.ts: failedAttempts + lockedAt).
// This in-memory layer adds IP-based throttling but resets on restart.

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Lazy expiry — clean up on access instead of setInterval
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  const resetIn = entry.resetAt - now;

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

// --- Security Headers ---

function applySecurityHeaders(response: NextResponse): NextResponse {
  const cspDirectives = [
    "default-src 'self'",
    // unsafe-inline required for Next.js hydration scripts; unsafe-eval only in dev
    process.env.NODE_ENV === "production"
      ? "script-src 'self' 'unsafe-inline'"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload"
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

// --- IP Extraction ---

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// --- Public Routes ---

const publicPatterns = [
  /^\/login(\/.*)?$/,
  /^\/api\/auth(\/.*)?$/,
  /^\/api\/health$/,
  /^\/api\/fax\/webhook$/,
  /^\/api\/v1(\/.*)?$/,
  /^\/onboarding$/,
];

function isPublicRoute(pathname: string): boolean {
  return publicPatterns.some((pattern) => pattern.test(pathname));
}

// --- MFA routes that partially-authenticated users can access ---

const mfaRoutes = ["/login/mfa", "/login/mfa/setup"];

function isMfaRoute(pathname: string): boolean {
  return mfaRoutes.includes(pathname);
}

// --- IP Allowlist ---

function isIpAllowed(ip: string): boolean {
  const allowedIps = process.env.ALLOWED_IPS;
  if (!allowedIps) return true; // No restriction if not configured
  const allowList = allowedIps.split(",").map((s) => s.trim());
  return allowList.includes(ip);
}

// --- Middleware ---

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const ip = getClientIp(request);

  // IP allowlisting (skip for public routes)
  if (!isPublicRoute(pathname) && !isIpAllowed(ip)) {
    return applySecurityHeaders(
      NextResponse.json({ error: "Forbidden" }, { status: 403 })
    );
  }

  // Rate limiting: login attempts
  if (pathname.startsWith("/api/auth") && request.method === "POST") {
    const { allowed, resetIn } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      const response = NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(resetIn / 1000)));
      return applySecurityHeaders(response);
    }
  }

  // Rate limiting: general submit
  if (request.method === "POST" && !pathname.startsWith("/api/auth")) {
    const { allowed, resetIn } = rateLimit(`submit:${ip}`, 60, 60 * 60 * 1000);
    if (!allowed) {
      const response = NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
      response.headers.set("Retry-After", String(Math.ceil(resetIn / 1000)));
      return applySecurityHeaders(response);
    }
  }

  // Public routes: apply security headers and pass through
  if (isPublicRoute(pathname)) {
    // But if user is on /login and fully authenticated, redirect to dashboard
    if (pathname === "/login" && request.auth?.user?.mfaVerified) {
      return applySecurityHeaders(NextResponse.redirect(new URL("/requests/new", request.url)));
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // Auth check: no session -> redirect to login
  const session = request.auth;
  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // MFA check: session exists but MFA not verified
  // If MFA is not enabled on the account, skip MFA entirely
  if (!session.user.mfaVerified && session.user.mfaEnabled) {
    // Allow access to MFA routes
    if (isMfaRoute(pathname)) {
      return applySecurityHeaders(NextResponse.next());
    }

    return applySecurityHeaders(
      NextResponse.redirect(new URL("/login/mfa", request.url))
    );
  }

  // Fully authenticated - proceed
  return applySecurityHeaders(NextResponse.next());
});

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
