import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyWebhook } from "@/lib/fax";
import { prisma } from "@/lib/db";
import { recalculateRequestStatus } from "@/lib/queue";

// --- In-memory rate limit: 60 requests/min/IP ---

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT;
}

// --- Zod schema for Notifyre webhook payload ---

const faxWebhookSchema = z.object({
  fax_id: z.string(),
  status: z.string(),
  completed_at: z.string().optional(),
  error_message: z.string().optional(),
});

// --- IP Allowlist for Notifyre webhook ---

function checkWebhookIpAllowlist(ip: string): boolean {
  const allowedIps = process.env.NOTIFYRE_WEBHOOK_IPS;
  if (!allowedIps) return true; // No restriction if not configured (development)
  const allowList = allowedIps.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowList.length === 0) return true;
  return allowList.includes(ip);
}

// --- POST handler ---

export async function POST(request: Request): Promise<NextResponse> {
  // Rate limit by IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  // IP allowlisting: reject requests from unknown IPs before any further processing
  if (!checkWebhookIpAllowlist(ip)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify HMAC signature
  const signature = request.headers.get("x-notifyre-signature");
  if (!signature || !verifyWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse and validate payload
  let payload: z.infer<typeof faxWebhookSchema>;
  try {
    const parsed = JSON.parse(rawBody);
    payload = faxWebhookSchema.parse(parsed);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Look up the delivery job by Notifyre fax ID
  const deliveryJob = await prisma.deliveryJob.findFirst({
    where: { externalId: payload.fax_id },
    select: { id: true, requestId: true, status: true },
  });

  if (!deliveryJob) {
    // Unknown fax ID — acknowledge to prevent retries
    return NextResponse.json({ received: true, matched: false }, { status: 200 });
  }

  // Map Notifyre status to our status
  let newStatus: string | undefined;
  if (payload.status === "completed") {
    newStatus = "delivered";
  } else if (payload.status === "failed") {
    newStatus = "failed";
  }

  if (newStatus) {
    await prisma.deliveryJob.update({
      where: { id: deliveryJob.id },
      data: {
        status: newStatus,
        confirmedAt: payload.completed_at ? new Date(payload.completed_at) : new Date(),
        lastError: payload.error_message || null,
      },
    });

    // Recalculate parent request status
    await recalculateRequestStatus(deliveryJob.requestId);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
