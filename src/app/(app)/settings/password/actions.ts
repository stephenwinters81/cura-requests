"use server";

import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { passwordChangeSchema } from "@/lib/validation";
import { revokeTrustedDevices } from "@/lib/trusted-device";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

export async function changePassword(formData: FormData) {
  const sessionUser = await requireAuth();

  const raw = {
    currentPassword: (formData.get("currentPassword") as string) ?? "",
    newPassword: (formData.get("newPassword") as string) ?? "",
    confirmPassword: (formData.get("confirmPassword") as string) ?? "",
  };

  const parsed = passwordChangeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { passwordHash: true },
  });

  if (!user) {
    return { error: "User not found" };
  }

  const valid = await compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "Current password is incorrect" };
  }

  const newHash = await hash(parsed.data.newPassword, 12);

  await prisma.user.update({
    where: { id: sessionUser.id },
    data: { passwordHash: newHash },
  });

  // Revoke all trusted devices on password change
  const revokedCount = await revokeTrustedDevices(sessionUser.id);

  await logAudit(
    sessionUser.id,
    "password_changed",
    "user",
    sessionUser.id,
    `User changed their own password${revokedCount > 0 ? ` (${revokedCount} trusted device(s) revoked)` : ""}`
  );

  revalidatePath("/settings/password");
  return { success: true };
}
