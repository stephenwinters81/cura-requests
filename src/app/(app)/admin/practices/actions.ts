"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { practiceSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createPractice(formData: FormData) {
  const user = await requireAdmin();

  const raw = {
    name: formData.get("name") as string,
    address: (formData.get("address") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    fax: (formData.get("fax") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
  };

  const parsed = practiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const practice = await prisma.radiologyPractice.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      email: parsed.data.email ?? null,
    },
  });

  await logAudit(user.id, "practice_created", "practice", practice.id, `Created practice: ${practice.name}`);

  revalidatePath("/admin/practices");
  redirect("/admin/practices");
}

export async function updatePractice(practiceId: string, formData: FormData) {
  const user = await requireAdmin();

  const raw = {
    name: formData.get("name") as string,
    address: (formData.get("address") as string) || undefined,
    phone: (formData.get("phone") as string) || undefined,
    fax: (formData.get("fax") as string) || undefined,
    email: (formData.get("email") as string) || undefined,
  };

  const parsed = practiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e: { message: string }) => e.message).join(", ") };
  }

  const practice = await prisma.radiologyPractice.update({
    where: { id: practiceId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      email: parsed.data.email ?? null,
    },
  });

  await logAudit(user.id, "practice_updated", "practice", practice.id, `Updated practice: ${practice.name}`);

  revalidatePath("/admin/practices");
  redirect("/admin/practices");
}

export async function deletePractice(practiceId: string) {
  const user = await requireAdmin();

  // Check if practice has requests
  const requestCount = await prisma.imagingRequest.count({
    where: { practiceId },
  });

  if (requestCount > 0) {
    return { error: `Cannot delete practice with ${requestCount} existing request(s). Archive instead.` };
  }

  const practice = await prisma.radiologyPractice.delete({
    where: { id: practiceId },
  });

  await logAudit(user.id, "practice_deleted", "practice", practiceId, `Deleted practice: ${practice.name}`);

  revalidatePath("/admin/practices");
  redirect("/admin/practices");
}
