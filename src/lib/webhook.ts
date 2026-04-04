import { createHmac } from "crypto";

interface WebhookApiKey {
  webhookUrl?: string | null;
  webhookSecret?: string | null;
}

const RETRY_DELAYS = [5_000, 30_000, 120_000];

/**
 * Dispatch a webhook notification to the configured URL.
 * Never throws -- webhook failures must not break callers.
 */
export async function dispatchWebhook(
  apiKey: WebhookApiKey,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!apiKey.webhookUrl || !apiKey.webhookSecret) {
    return;
  }

  const body = JSON.stringify({
    event,
    ...payload,
    timestamp: new Date().toISOString(),
  });

  const signature =
    "sha256=" +
    createHmac("sha256", apiKey.webhookSecret).update(body).digest("hex");

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5_000);

      const response = await fetch(apiKey.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requests-Signature": signature,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return;
      }

      console.error(
        `Webhook attempt ${attempt + 1} failed: HTTP ${response.status}`
      );
    } catch (err) {
      console.error(
        `Webhook attempt ${attempt + 1} error:`,
        err instanceof Error ? err.message : err
      );
    }

    // Wait before retry (unless last attempt)
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
    }
  }

  console.error(
    `Webhook delivery failed after 3 attempts for event: ${event}`
  );
}
