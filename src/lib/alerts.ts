import { sendAlertEmail } from "@/lib/email";
import { sendAdminSms } from "@/lib/fax";
import { logAudit } from "@/lib/audit";

// --- In-memory throttle (per-process, survives across requests) ---

const lastAlertedAt = new Map<string, number>();
const THROTTLE_MS = 15 * 60 * 1000; // 15 minutes

function isThrottled(key: string): boolean {
  const last = lastAlertedAt.get(key) ?? 0;
  return Date.now() - last < THROTTLE_MS;
}

function markAlerted(key: string): void {
  lastAlertedAt.set(key, Date.now());
}

// --- Send alert via email + SMS fallback ---

async function sendAlert(subject: string, body: string, smsBody: string): Promise<void> {
  // Try email first — if it fails, fall back to SMS
  let emailOk = false;
  try {
    await sendAlertEmail(subject, body);
    emailOk = true;
  } catch {
    // Email failed — will fall through to SMS
  }

  if (!emailOk) {
    await sendAdminSms(smsBody);
  }
}

// --- Alert: delivery job permanently failed ---

export async function alertDeliveryFailure(opts: {
  deliveryJobId: string;
  requestId: string;
  type: string;
  error: string;
}): Promise<void> {
  // No throttling for delivery failures — these only fire on permanent failure
  // (after all retries exhausted), so each alert represents a distinct problem.

  const appUrl = process.env.NEXTAUTH_URL || "https://requests.cura";

  const subject = `Delivery failure: ${opts.type}`;
  const body = [
    "A delivery job has permanently failed after all retries.",
    "",
    `Type: ${opts.type}`,
    `Request ID: ${opts.requestId}`,
    `Job ID: ${opts.deliveryJobId}`,
    `Error: ${opts.error}`,
    `Time: ${new Date().toISOString()}`,
    "",
    `Review at: ${appUrl}/admin/system`,
  ].join("\n");

  const smsBody = `CURA: ${opts.type} delivery failed — ${opts.error.slice(0, 80)}. Review at ${appUrl}/admin/system`;

  await sendAlert(subject, body, smsBody);

  await logAudit(null, "system_alert_sent", undefined, opts.requestId, `Alert: ${opts.type} delivery failed`);
}

// --- Alert: dependency is down ---

export type AlertDependency = "smtp" | "notifyre" | "database" | "redis" | "worker";

export async function alertDependencyDown(opts: {
  dependency: AlertDependency;
  error: string;
}): Promise<void> {
  const key = `dependency:${opts.dependency}`;
  if (isThrottled(key)) return;
  markAlerted(key);

  const appUrl = process.env.NEXTAUTH_URL || "https://requests.cura";

  const subject = `Dependency down: ${opts.dependency}`;
  const body = [
    `The ${opts.dependency} service is unreachable.`,
    "",
    `Error: ${opts.error}`,
    `Time: ${new Date().toISOString()}`,
    "",
    `Review at: ${appUrl}/admin/system`,
  ].join("\n");

  const smsBody = `CURA: ${opts.dependency} is DOWN — ${opts.error.slice(0, 80)}`;

  await sendAlert(subject, body, smsBody);

  await logAudit(null, "system_alert_sent", undefined, undefined, `Alert: ${opts.dependency} down — ${opts.error}`);
}
