import { NextResponse } from "next/server";
import { signIn } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import {
  createTrustedDevice,
  COOKIE_NAME,
  buildTrustCookieOptions,
} from "@/lib/trusted-device";

export async function POST(request: Request) {
  const { email, code, rememberDevice } = await request.json();

  if (!email || !code) {
    return NextResponse.json(
      { error: "Email and code are required" },
      { status: 400 }
    );
  }

  try {
    // signIn via Auth.js — this will call authorize() which verifies the TOTP code
    // In Auth.js v5, server-side signIn may throw a redirect on success
    await signIn("credentials", {
      email,
      mfaCode: code,
      redirect: false,
    });
  } catch (error: unknown) {
    // Auth.js v5 throws NEXT_REDIRECT on success — check if it's a redirect
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string" &&
      (error as { digest: string }).digest.includes("NEXT_REDIRECT")
    ) {
      // This is actually a success — Auth.js redirected
      // Fall through to handle rememberDevice below
    } else {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 401 }
      );
    }
  }

  const response = NextResponse.json({ success: true });

  if (rememberDevice) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      const userAgent =
        request.headers.get("user-agent") ?? undefined;
      const token = await createTrustedDevice(user.id, userAgent);
      response.cookies.set(COOKIE_NAME, token, buildTrustCookieOptions());

      await logAudit(
        user.id,
        "device_trusted",
        "trusted_device",
        undefined,
        "Device trusted for 30 days"
      );
    }
  }

  return response;
}
