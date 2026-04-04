import { NextResponse } from "next/server";
import { verify as otpVerify, generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { encryptField, decryptField } from "@/lib/encryption";
import { mfaSchema } from "@/lib/validation";

// POST: Generate MFA secret and QR code
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = generateSecret();

  // Store encrypted secret on user (mfaEnabled stays false until verified)
  const encryptedSecret = await encryptField(secret);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaSecret: encryptedSecret },
  });

  const otpauthUri = generateURI({
    issuer: "CURA Requests",
    label: session.user.email,
    secret,
  });

  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri, {
    width: 200,
    margin: 1,
    color: { dark: "#1a1a1a", light: "#ffffff" },
  });

  return NextResponse.json({ qrCodeDataUrl, secret });
}

// PUT: Verify TOTP code and enable MFA
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = mfaSchema.safeParse({ code: body.code });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid code format. Must be 6 digits." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { mfaSecret: true },
  });

  if (!user?.mfaSecret) {
    return NextResponse.json(
      { error: "MFA setup not initiated. Please start setup again." },
      { status: 400 }
    );
  }

  const decryptedSecret = await decryptField(user.mfaSecret);
  const verifyResult = await otpVerify({
    token: body.code,
    secret: decryptedSecret,
  });
  const isValid = verifyResult.valid;

  if (!isValid) {
    return NextResponse.json({ error: "Invalid verification code." }, { status: 400 });
  }

  // Enable MFA
  await prisma.user.update({
    where: { id: session.user.id },
    data: { mfaEnabled: true },
  });

  await logAudit(session.user.id, "mfa_setup", "user", session.user.id, "MFA enabled");

  return NextResponse.json({ success: true });
}
