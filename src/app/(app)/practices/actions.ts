"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { validateAndNormalize } from "@/lib/practices/validation";
import { findDuplicatePractices } from "@/lib/practices/duplicates";
import { searchPracticesWithAI } from "@/lib/practices/lookup";
import type { PracticeFormData, DuplicateMatch, PracticeLookupResult } from "@/lib/practices/types";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

// --- Check for duplicate practices ---

export async function checkPracticeDuplicates(
  data: PracticeFormData
): Promise<{ duplicates: DuplicateMatch[] }> {
  await requireAuth();

  try {
    const duplicates = await findDuplicatePractices(data);
    return { duplicates };
  } catch (error) {
    console.error("Duplicate check failed:", error);
    return { duplicates: [] };
  }
}

// --- AI-assisted practice lookup ---

export async function lookupPracticeAI(
  query: string
): Promise<{ results: PracticeLookupResult[]; error?: string }> {
  await requireAuth();

  if (!query.trim() || query.trim().length < 3) {
    return { results: [], error: "Please enter at least 3 characters" };
  }

  return searchPracticesWithAI(query.trim());
}

// --- Create a new practice ---

export async function createPracticeRecord(
  data: PracticeFormData
): Promise<{ success: true; practice: { id: string; name: string; address: string | null; phone: string | null; fax: string | null; email: string | null; usageCount: number } } | { success: false; errors: Record<string, string> }> {
  const user = await requireAuth();

  const validation = validateAndNormalize(data);
  if (!validation.valid) {
    return { success: false, errors: validation.errors };
  }

  const normalized = validation.data;

  const practice = await prisma.radiologyPractice.create({
    data: {
      name: normalized.name,
      address: normalized.address ?? null,
      phone: normalized.phone ?? null,
      fax: normalized.fax ?? null,
      email: normalized.email ?? null,
    },
  });

  await logAudit(
    user.id,
    "practice_created",
    "practice",
    practice.id,
    `Created practice: ${practice.name}`
  );

  return {
    success: true,
    practice: {
      id: practice.id,
      name: practice.name,
      address: practice.address,
      phone: practice.phone,
      fax: practice.fax,
      email: practice.email,
      usageCount: practice.usageCount,
    },
  };
}
