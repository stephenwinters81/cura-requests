"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import fs from "fs";
import path from "path";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

export async function uploadSignature(formData: FormData) {
  const user = await requireAuth();

  const file = formData.get("signature") as File | null;
  if (!file || file.size === 0) {
    return { error: "No file selected" };
  }

  // Validate file size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    return { error: "File must be under 2MB" };
  }

  // Validate file content by magic bytes (don't trust browser MIME type)
  const buffer = Buffer.from(await file.arrayBuffer());
  let ext: string;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    ext = "png";
  } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    ext = "jpg";
  } else if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    ext = "webp";
  } else {
    return { error: "Invalid image file. Only PNG, JPEG, or WebP are accepted." };
  }
  const filename = `${user.id}.${ext}`;
  const sigDir = path.join(process.cwd(), "data", "signatures");
  const filePath = path.join(sigDir, filename);

  // Remove any existing signature for this user
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { signatureImage: true },
  });
  if (existing?.signatureImage) {
    const oldPath = path.join(process.cwd(), "data", existing.signatureImage);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  // Write new file (buffer already read for magic byte validation)
  fs.writeFileSync(filePath, buffer);

  // Update user record
  const relativePath = `signatures/${filename}`;
  await prisma.user.update({
    where: { id: user.id },
    data: { signatureImage: relativePath },
  });

  await logAudit(
    user.id,
    "user_updated",
    "user",
    user.id,
    "Signature image uploaded"
  );

  revalidatePath("/settings/signature");
  return { success: true };
}

export async function removeSignature() {
  const user = await requireAuth();

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { signatureImage: true },
  });

  if (existing?.signatureImage) {
    const filePath = path.join(process.cwd(), "data", existing.signatureImage);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { signatureImage: null },
  });

  await logAudit(
    user.id,
    "user_updated",
    "user",
    user.id,
    "Signature image removed"
  );

  revalidatePath("/settings/signature");
  return { success: true };
}
