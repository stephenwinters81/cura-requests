"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { userSchema } from "@/lib/validation";
import { sendWelcomeEmail } from "@/lib/email";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

function generateTempPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export async function createUser(formData: FormData): Promise<{ tempPassword?: string; emailSent?: boolean; error?: string }> {
  const user = await requireAdmin();

  const raw = {
    email: formData.get("email") as string,
    name: formData.get("name") as string,
    role: formData.get("role") as string,
    defaultProviderId: (formData.get("defaultProviderId") as string) || undefined,
  };

  const parsed = userSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  // Check for duplicate email
  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) {
    return { error: "A user with this email already exists" };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 12);

  const newUser = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash,
      defaultProviderId: parsed.data.defaultProviderId ?? null,
    },
  });

  await logAudit(user.id, "user_created", "user", newUser.id, `Created user: ${newUser.email} (${newUser.role})`);

  // Send welcome email with temp password (best-effort — admin still sees the password as fallback)
  const emailResult = await sendWelcomeEmail(parsed.data.email, parsed.data.name, tempPassword);
  if (!emailResult.success) {
    console.error(`Failed to send welcome email to ${parsed.data.email}:`, emailResult.error);
  }

  revalidatePath("/admin/users");
  return { tempPassword, emailSent: emailResult.success };
}

export async function updateUser(userId: string, formData: FormData): Promise<{ error?: string }> {
  const currentUser = await requireAdmin();

  const name = formData.get("name") as string;
  const role = formData.get("role") as string;

  if (!name || !role) {
    return { error: "Name and role are required" };
  }

  // Prevent demoting self
  if (userId === currentUser.id && role !== "admin") {
    return { error: "You cannot change your own role" };
  }

  // Prevent demoting last admin
  if (role !== "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (targetUser?.role === "admin" && adminCount <= 1) {
      return { error: "Cannot demote the last admin user" };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { name, role },
  });

  await logAudit(currentUser.id, "user_updated", "user", userId, `Updated user: name=${name}, role=${role}`);

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

export async function resetPassword(userId: string): Promise<{ tempPassword?: string; error?: string }> {
  const currentUser = await requireAdmin();

  const tempPassword = generateTempPassword();
  const passwordHash = await hash(tempPassword, 12);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      failedAttempts: 0,
      lockedAt: null,
      // Force MFA re-setup on next login
      mfaEnabled: false,
      mfaSecret: null,
    },
  });

  await logAudit(currentUser.id, "user_updated", "user", userId, "Password reset + MFA cleared");

  return { tempPassword };
}

export async function toggleUserActive(userId: string): Promise<{ error?: string }> {
  const currentUser = await requireAdmin();

  // Cannot deactivate self
  if (userId === currentUser.id) {
    return { error: "You cannot deactivate your own account" };
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return { error: "User not found" };

  // Use lockedAt far-future as "deactivated" signal
  const FAR_FUTURE = new Date("2099-12-31T23:59:59.000Z");
  const isCurrentlyDeactivated = targetUser.lockedAt && targetUser.lockedAt.getTime() > Date.now() + 365 * 24 * 60 * 60 * 1000;

  if (isCurrentlyDeactivated) {
    // Reactivate
    await prisma.user.update({
      where: { id: userId },
      data: { lockedAt: null, failedAttempts: 0 },
    });
    await logAudit(currentUser.id, "user_updated", "user", userId, "User reactivated");
  } else {
    // Deactivate
    await prisma.user.update({
      where: { id: userId },
      data: { lockedAt: FAR_FUTURE, failedAttempts: 999 },
    });
    await logAudit(currentUser.id, "user_updated", "user", userId, "User deactivated");
  }

  revalidatePath("/admin/users");
  return {};
}
