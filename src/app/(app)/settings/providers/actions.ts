"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { providerSchema } from "@/lib/validation";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

export async function createProvider(formData: FormData) {
  const user = await requireAuth();

  const raw = {
    providerNumber: (formData.get("providerNumber") as string)?.trim(),
    location: (formData.get("location") as string)?.trim(),
    address: (formData.get("address") as string)?.trim() || undefined,
    phone: (formData.get("phone") as string)?.trim() || undefined,
    fax: (formData.get("fax") as string)?.trim() || undefined,
    email: (formData.get("email") as string)?.trim() || undefined,
  };

  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  // Check for duplicate provider number
  const existing = await prisma.provider.findUnique({
    where: { providerNumber: parsed.data.providerNumber },
  });
  if (existing) {
    return { error: "This provider number is already registered" };
  }

  const provider = await prisma.provider.create({
    data: {
      doctorName: user.name,
      providerNumber: parsed.data.providerNumber,
      location: parsed.data.location,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      email: parsed.data.email ?? null,
      users: { connect: { id: user.id } },
    },
  });

  // Set as default if this is the user's first provider
  const providerCount = await prisma.provider.count({
    where: { users: { some: { id: user.id } } },
  });
  if (providerCount === 1) {
    await prisma.user.update({
      where: { id: user.id },
      data: { defaultProviderId: provider.id },
    });
  }

  await logAudit(
    user.id,
    "provider_created",
    "provider",
    provider.id,
    `Created provider: ${parsed.data.providerNumber} at ${parsed.data.location}`
  );

  revalidatePath("/settings/providers");
  redirect("/settings/providers");
}

export async function updateProvider(providerId: string, formData: FormData) {
  const user = await requireAuth();

  // Verify ownership
  const provider = await prisma.provider.findFirst({
    where: {
      id: providerId,
      users: { some: { id: user.id } },
    },
  });
  if (!provider) {
    return { error: "Provider not found" };
  }

  const raw = {
    providerNumber: (formData.get("providerNumber") as string)?.trim(),
    location: (formData.get("location") as string)?.trim(),
    address: (formData.get("address") as string)?.trim() || undefined,
    phone: (formData.get("phone") as string)?.trim() || undefined,
    fax: (formData.get("fax") as string)?.trim() || undefined,
    email: (formData.get("email") as string)?.trim() || undefined,
  };

  const parsed = providerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: parsed.error.issues.map((e) => e.message).join(", "),
    };
  }

  // Check for duplicate provider number (if changed)
  if (parsed.data.providerNumber !== provider.providerNumber) {
    const existing = await prisma.provider.findUnique({
      where: { providerNumber: parsed.data.providerNumber },
    });
    if (existing) {
      return { error: "This provider number is already registered" };
    }
  }

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      providerNumber: parsed.data.providerNumber,
      location: parsed.data.location,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      email: parsed.data.email ?? null,
    },
  });

  await logAudit(
    user.id,
    "provider_updated",
    "provider",
    providerId,
    `Updated provider: ${parsed.data.providerNumber} at ${parsed.data.location}`
  );

  revalidatePath("/settings/providers");
  redirect("/settings/providers");
}

export async function deleteProvider(providerId: string) {
  const user = await requireAuth();

  // Verify ownership
  const provider = await prisma.provider.findFirst({
    where: {
      id: providerId,
      users: { some: { id: user.id } },
    },
    include: { _count: { select: { requests: true } } },
  });
  if (!provider) {
    return { error: "Provider not found" };
  }

  if (provider._count.requests > 0) {
    return {
      error: `Cannot delete provider with ${provider._count.requests} existing request(s).`,
    };
  }

  // Remove from user's providers
  await prisma.provider.update({
    where: { id: providerId },
    data: { users: { disconnect: { id: user.id } } },
  });

  // If this was the default, clear it
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultProviderId: true },
  });
  if (currentUser?.defaultProviderId === providerId) {
    const nextProvider = await prisma.provider.findFirst({
      where: { users: { some: { id: user.id } } },
      select: { id: true },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { defaultProviderId: nextProvider?.id ?? null },
    });
  }

  // Delete the provider record if no other users reference it
  const otherUsers = await prisma.provider.findUnique({
    where: { id: providerId },
    include: { _count: { select: { users: true } } },
  });
  if (otherUsers && otherUsers._count.users === 0) {
    await prisma.provider.delete({ where: { id: providerId } });
  }

  await logAudit(
    user.id,
    "provider_deleted",
    "provider",
    providerId,
    `Removed provider: ${provider.providerNumber}`
  );

  revalidatePath("/settings/providers");
  redirect("/settings/providers");
}

export async function setDefaultProvider(providerId: string) {
  const user = await requireAuth();

  // Verify ownership
  const provider = await prisma.provider.findFirst({
    where: {
      id: providerId,
      users: { some: { id: user.id } },
    },
  });
  if (!provider) {
    return { error: "Provider not found" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { defaultProviderId: providerId },
  });

  revalidatePath("/settings/providers");
}
