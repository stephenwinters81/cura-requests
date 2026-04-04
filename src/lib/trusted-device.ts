import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";

export const COOKIE_NAME = "__Host-device-trust";
const TOKEN_BYTES = 32;
const TRUST_DURATION_DAYS = 30;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createTrustedDevice(
  userId: string,
  userAgent?: string
): Promise<string> {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(
    Date.now() + TRUST_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.trustedDevice.create({
    data: {
      userId,
      tokenHash,
      label: userAgent?.slice(0, 200) ?? null,
      expiresAt,
    },
  });

  return token;
}

/**
 * Verify a trusted device token string against the DB.
 * Does not read cookies — caller provides the raw token.
 */
export async function verifyTrustedDeviceFromToken(
  userId: string,
  token: string
): Promise<boolean> {
  const tokenHash = hashToken(token);
  const device = await prisma.trustedDevice.findUnique({
    where: { tokenHash },
  });

  if (!device) return false;
  if (device.userId !== userId) return false;
  if (device.expiresAt < new Date()) {
    await prisma.trustedDevice
      .delete({ where: { id: device.id } })
      .catch(() => {});
    return false;
  }

  return true;
}

export async function revokeTrustedDevices(userId: string): Promise<number> {
  const result = await prisma.trustedDevice.deleteMany({
    where: { userId },
  });
  return result.count;
}

export function buildTrustCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: TRUST_DURATION_DAYS * 24 * 60 * 60,
  };
}
