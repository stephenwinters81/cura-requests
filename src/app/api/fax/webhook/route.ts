import { NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/fax";
import { prisma } from "@/lib/db";
import { recalculateRequestStatus } from "@/lib/queue";
import { logAudit } from "@/lib/audit";

// --- Rate limit: 60 requests/min/IP ---

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  entry.count++;
  return entry.count <= 60;
}

// --- POST handler ---

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  // Read body as text first, then parse
  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Fax webhook: invalid JSON body");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Verify HMAC signature (Notifyre format: "t=<timestamp>,v=<hmac>")
  // Check common header names
  const signatureHeader =
    request.headers.get("x-notifyre-signature") ||
    request.headers.get("x-signature") ||
    request.headers.get("signature");

  if (!signatureHeader || !verifyWebhook(signatureHeader, payload)) {
    console.error("Fax webhook: signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Extract fax ID and status from payload
  // Notifyre may nest data differently — handle multiple shapes
  const faxId =
    (payload.faxID as string) ||
    (payload.fax_id as string) ||
    (payload.id as string) ||
    ((payload.data as Record<string, unknown>)?.faxID as string) ||
    ((payload.data as Record<string, unknown>)?.fax_id as string);

  const eventStatus =
    (payload.status as string) ||
    ((payload.data as Record<string, unknown>)?.status as string);

  if (!faxId) {
    // Log the payload shape for debugging, but acknowledge to prevent retries
    console.error("Fax webhook: no fax ID found in payload. Keys:", Object.keys(payload));
    return NextResponse.json({ received: true, matched: false }, { status: 200 });
  }

  // Look up the delivery job by Notifyre fax ID
  const deliveryJob = await prisma.deliveryJob.findFirst({
    where: { externalId: faxId },
    select: { id: true, requestId: true, status: true },
  });

  if (!deliveryJob) {
    console.log("Fax webhook: no matching delivery job for fax ID:", faxId);
    return NextResponse.json({ received: true, matched: false }, { status: 200 });
  }

  // Map Notifyre status to our status
  const statusLower = (eventStatus || "").toLowerCase();
  let newStatus: string | undefined;
  if (
    statusLower === "completed" ||
    statusLower === "successful" ||
    statusLower === "delivered"
  ) {
    newStatus = "delivered";
  } else if (statusLower === "failed" || statusLower === "error") {
    newStatus = "failed";
  }

  if (newStatus && deliveryJob.status !== newStatus) {
    await prisma.deliveryJob.update({
      where: { id: deliveryJob.id },
      data: {
        status: newStatus,
        confirmedAt: new Date(),
        lastError:
          (payload.error_message as string) ||
          (payload.errorMessage as string) ||
          ((payload.data as Record<string, unknown>)?.errorMessage as string) ||
          null,
      },
    });

    await recalculateRequestStatus(deliveryJob.requestId);

    await logAudit(
      null,
      newStatus === "delivered" ? "delivery_completed" : "delivery_failed",
      "imaging_request",
      deliveryJob.requestId,
      `Fax ${faxId} ${newStatus}`
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
