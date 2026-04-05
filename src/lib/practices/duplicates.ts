import { prisma } from "@/lib/db";
import { formatAustralianNumber } from "./validation";
import type { PracticeFormData, DuplicateMatch } from "./types";

/**
 * Find existing practices that may be duplicates of the candidate.
 * Uses case-insensitive name matching and normalized fax/email comparison.
 */
export async function findDuplicatePractices(
  candidate: PracticeFormData
): Promise<DuplicateMatch[]> {
  const matches: DuplicateMatch[] = [];
  const seenIds = new Set<string>();

  // 1. Exact fax match (try normalized and raw forms)
  if (candidate.fax) {
    const normalizedFax = formatAustralianNumber(candidate.fax);
    const rawFax = candidate.fax.trim();
    const faxMatches = await prisma.radiologyPractice.findMany({
      where: {
        OR: [
          { fax: normalizedFax },
          { fax: rawFax },
        ],
      },
      select: { id: true, name: true, address: true, phone: true, fax: true, email: true },
    });

    for (const p of faxMatches) {
      seenIds.add(p.id);
      matches.push({ ...p, matchReason: "Same fax number" });
    }
  }

  // 2. Exact email match
  if (candidate.email) {
    const emailMatches = await prisma.radiologyPractice.findMany({
      where: { email: { equals: candidate.email.trim().toLowerCase(), mode: "insensitive" } },
      select: { id: true, name: true, address: true, phone: true, fax: true, email: true },
    });

    for (const p of emailMatches) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        matches.push({ ...p, matchReason: "Same email address" });
      }
    }
  }

  // 3. Name similarity (case-insensitive contains)
  if (candidate.name.length >= 3) {
    // Search for practices containing the candidate name or vice versa
    const nameMatches = await prisma.radiologyPractice.findMany({
      where: {
        OR: [
          { name: { contains: candidate.name.trim(), mode: "insensitive" } },
          { name: { contains: extractCoreName(candidate.name), mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, address: true, phone: true, fax: true, email: true },
      take: 10,
    });

    for (const p of nameMatches) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        matches.push({ ...p, matchReason: "Similar name" });
      }
    }
  }

  return matches.slice(0, 5);
}

/**
 * Extract the core name from a practice name by removing common suffixes.
 * e.g., "I-MED Radiology Drummoyne" -> "I-MED"
 *        "Lumus Imaging Bankstown" -> "Lumus"
 */
function extractCoreName(name: string): string {
  const stripped = name
    .replace(/\b(radiology|imaging|medical|diagnostic|nuclear medicine|hospital|dept|department)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Return at least 3 chars of the core name
  return stripped.length >= 3 ? stripped : name.trim();
}
