import crypto from "crypto";

// --- Interfaces ---

export interface FaxResult {
  success: boolean;
  faxId?: string;
  error?: string;
}

export interface RequestFaxData {
  patientName: string;
  examType: string;
  providerName: string;
  practiceName: string;
}

// --- Normalize Australian fax number to E.164 ---

export function normalizeFaxNumber(raw: string): string {
  // Strip spaces, dashes, parentheses
  let cleaned = raw.replace(/[\s\-()]/g, "");

  // Already E.164
  if (cleaned.startsWith("+61")) {
    return cleaned;
  }

  // International with 0061
  if (cleaned.startsWith("0061")) {
    return "+" + cleaned.slice(2);
  }

  // Australian domestic with leading 0
  if (cleaned.startsWith("0")) {
    return "+61" + cleaned.slice(1);
  }

  // Assume Australian without leading 0
  return "+61" + cleaned;
}

// --- Notifyre API helpers ---

const NOTIFYRE_BASE = "https://api.notifyre.com";

function notifyreHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-api-token": process.env.NOTIFYRE_API_KEY!,
  };
}

// --- Send fax via Notifyre (3-step: upload, poll conversion, send) ---

export async function sendFax(
  faxNumber: string,
  pdfBuffer: Buffer,
  _requestData: RequestFaxData
): Promise<FaxResult> {
  try {
    const normalizedNumber = normalizeFaxNumber(faxNumber);

    // Step 1: Upload document for conversion
    const uploadRes = await fetch(`${NOTIFYRE_BASE}/fax/send/conversion`, {
      method: "POST",
      headers: notifyreHeaders(),
      body: JSON.stringify({
        base64Str: pdfBuffer.toString("base64"),
        contentType: "application/pdf",
      }),
    });
    const upload = (await uploadRes.json()) as {
      success: boolean;
      payload?: { fileID?: string; fileName?: string };
      message?: string;
    };
    if (!upload.success || !upload.payload) {
      return { success: false, error: `Fax upload failed: ${upload.message}` };
    }
    const fileId = upload.payload.fileID || upload.payload.fileName;

    // Step 2: Poll until conversion completes (max 60s)
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const pollRes = await fetch(
        `${NOTIFYRE_BASE}/fax/send/conversion/${fileId}`,
        { headers: notifyreHeaders() }
      );
      const poll = (await pollRes.json()) as {
        payload?: { status?: string };
      };
      if (poll.payload?.status === "successful" || poll.payload?.status === "completed") {
        break;
      }
    }

    // Step 3: Send fax
    const sendRes = await fetch(`${NOTIFYRE_BASE}/fax/send`, {
      method: "POST",
      headers: notifyreHeaders(),
      body: JSON.stringify({
        faxes: {
          recipients: [{ type: "fax_number", value: normalizedNumber }],
          files: [fileId],
          isHighQuality: false,
          sendFrom: process.env.NOTIFYRE_SENDER_ID || undefined,
        },
      }),
    });
    const send = (await sendRes.json()) as {
      success: boolean;
      payload?: { faxID?: string };
      message?: string;
    };

    if (!send.success) {
      return { success: false, error: `Fax send failed: ${send.message}` };
    }

    return { success: true, faxId: send.payload?.faxID };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown fax error",
    };
  }
}

// --- Verify Notifyre webhook signature ---
// Notifyre sends: header = "t=<timestamp>,v=<hmac>"
// Signature is HMAC-SHA256 of "<timestamp>.<json_payload>" using the webhook secret

export function verifyWebhook(
  signatureHeader: string,
  payload: unknown,
  toleranceSec = 300
): boolean {
  const secret = process.env.NOTIFYRE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("NOTIFYRE_WEBHOOK_SECRET not configured");
    return false;
  }

  try {
    // Parse "t=<timestamp>,v=<signature>" header
    let timestamp = "";
    let signature = "";
    for (const part of signatureHeader.split(",")) {
      const [key, val] = part.split("=");
      if (key === "t") timestamp = val;
      if (key === "v") signature = val;
    }

    if (!timestamp || !signature) return false;

    // Check timestamp freshness
    const now = Date.now() / 1000;
    if (now - Number(timestamp) > toleranceSec) return false;

    // Compute expected signature
    const message = `${timestamp}.${JSON.stringify(payload)}`;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    // Timing-safe comparison
    const sigBuffer = Buffer.from(signature, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (sigBuffer.length !== expectedBuffer.length) return false;

    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
