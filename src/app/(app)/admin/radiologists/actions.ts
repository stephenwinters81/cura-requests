"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const radiologistSchema = z.object({
  name: z.string().min(1, "Name is required"),
  practiceIds: z.array(z.string()).min(1, "At least one practice is required"),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session.user;
}

export async function createRadiologist(formData: FormData) {
  const user = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const practiceIds = formData.getAll("practiceIds") as string[];

  const parsed = radiologistSchema.safeParse({ name, practiceIds });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  const radiologist = await prisma.radiologist.create({
    data: {
      name: parsed.data.name,
      practices: {
        connect: parsed.data.practiceIds.map((id) => ({ id })),
      },
    },
  });

  await logAudit(
    user.id,
    "provider_created",
    "provider",
    radiologist.id,
    `Created radiologist: ${parsed.data.name}`
  );

  revalidatePath("/admin/radiologists");
  redirect("/admin/radiologists");
}

export async function updateRadiologist(radiologistId: string, formData: FormData) {
  const user = await requireAdmin();

  const name = (formData.get("name") as string)?.trim();
  const practiceIds = formData.getAll("practiceIds") as string[];

  const parsed = radiologistSchema.safeParse({ name, practiceIds });
  if (!parsed.success) {
    return { error: parsed.error.issues.map((e) => e.message).join(", ") };
  }

  await prisma.radiologist.update({
    where: { id: radiologistId },
    data: {
      name: parsed.data.name,
      practices: {
        set: parsed.data.practiceIds.map((id) => ({ id })),
      },
    },
  });

  await logAudit(
    user.id,
    "provider_updated",
    "provider",
    radiologistId,
    `Updated radiologist: ${parsed.data.name}`
  );

  revalidatePath("/admin/radiologists");
  redirect("/admin/radiologists");
}

export async function deleteRadiologist(radiologistId: string) {
  const user = await requireAdmin();

  const radiologist = await prisma.radiologist.findUnique({
    where: { id: radiologistId },
    include: { _count: { select: { requests: true } } },
  });

  if (!radiologist) {
    return { error: "Radiologist not found" };
  }

  if (radiologist._count.requests > 0) {
    return {
      error: `Cannot delete radiologist with ${radiologist._count.requests} existing request(s).`,
    };
  }

  await prisma.radiologist.delete({ where: { id: radiologistId } });

  await logAudit(
    user.id,
    "provider_deleted",
    "provider",
    radiologistId,
    `Deleted radiologist: ${radiologist.name}`
  );

  revalidatePath("/admin/radiologists");
  redirect("/admin/radiologists");
}
