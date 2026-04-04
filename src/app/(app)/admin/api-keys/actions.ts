"use server";

import { revalidatePath } from "next/cache";
import { randomBytes, createHash } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { apiKeyCreateSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createApiKey(formData: FormData): Promise<{ fullKey?: string; error?: string }> {
  const user = await requireAdmin();

  const scopesRaw = formData.getAll("scopes") as string[];
  const allowedIpsRaw = (formData.get("allowedIps") as string) || "";
  const allowedIps = allowedIpsRaw
    .split(/[,\n]/)
    .map((ip) => ip.trim())
    .filter(Boolean);

  const raw = {
    name: formData.get("name") as string,
    userId: formData.get("userId") as string,
    scopes: scopesRaw,
    webhookUrl: (formData.get("webhookUrl") as string) || undefined,
    allowedIps,
    expiresAt: (formData.get("expiresAt") as string) || undefined,
  };

  const parsed = apiKeyCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  // Generate key with environment-appropriate prefix
  const keyEnvPrefix = process.env.NODE_ENV === "production" ? "rq_live_" : "rq_test_";
  const randomPart = randomBytes(32).toString("hex");
  const fullKey = `${keyEnvPrefix}${randomPart}`;
  const keyPrefix = fullKey.slice(0, 16); // prefix + first hex chars
  const keyHash = createHash("sha256").update(fullKey).digest("hex");

  // Generate webhook secret if webhookUrl provided
  let webhookSecret: string | null = null;
  if (parsed.data.webhookUrl) {
    webhookSecret = randomBytes(32).toString("hex");
  }

  const apiKey = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      keyHash,
      keyPrefix,
      userId: parsed.data.userId,
      scopes: parsed.data.scopes,
      webhookUrl: parsed.data.webhookUrl ?? null,
      webhookSecret,
      allowedIps: parsed.data.allowedIps ?? [],
      expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
    },
  });

  await logAudit(
    user.id,
    "api_key_created",
    "api_key",
    apiKey.id,
    `Created API key: ${apiKey.name} (prefix: ${keyPrefix})`
  );

  revalidatePath("/admin/api-keys");
  return { fullKey };
}

export async function revokeApiKey(apiKeyId: string): Promise<{ error?: string }> {
  const user = await requireAdmin();

  const apiKey = await prisma.apiKey.findUnique({ where: { id: apiKeyId } });
  if (!apiKey) return { error: "API key not found" };
  if (apiKey.revokedAt) return { error: "API key is already revoked" };

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { revokedAt: new Date() },
  });

  await logAudit(
    user.id,
    "api_key_revoked",
    "api_key",
    apiKeyId,
    `Revoked API key: ${apiKey.name}`
  );

  revalidatePath("/admin/api-keys");
  revalidatePath(`/admin/api-keys/${apiKeyId}`);
  return {};
}
