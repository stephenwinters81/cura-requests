/**
 * PHI Parser — TypeScript port of Synaptum7 phi_parser.py
 *
 * Parses raw patient details text into structured PHI entities.
 * Never throws — returns empty arrays on failure.
 */

import type { ParsedPhi } from "@/lib/types";

// --- Regex Helpers ---

function dedupe(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function matchAll(text: string, pattern: RegExp): string[] {
  const results: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
  while ((match = re.exec(text)) !== null) {
    const value = match[1] ?? match[0];
    if (value.trim()) results.push(value.trim());
  }
  return results;
}

// --- Name Extraction ---

const LABEL_MARKERS = ["dob", "mrn", "phone", "email", "medicare", "@", "gender", "mob", "address", "d.o.b"];

function extractNames(text: string): string[] {
  const names: string[] = [];

  const lines = text.split("\n");

  // Check for explicit Name:/Patient: labels anywhere in text
  const labelPatterns = [
    /(?:Patient Name|Patient|Name)\s*:\s*(.+)/i,
  ];
  for (const pattern of labelPatterns) {
    const matches = matchAll(text, pattern);
    for (const m of matches) {
      const cleaned = m.trim();
      if (cleaned && cleaned.split(/\s+/).length >= 2 && cleaned.length < 100) {
        names.push(cleaned);
      }
    }
  }

  // First non-empty line heuristic
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const wordCount = trimmed.split(/\s+/).length;
    const hasMarker = LABEL_MARKERS.some((m) => trimmed.toLowerCase().includes(m));
    const hasColon = trimmed.includes(":");

    if (trimmed.length < 100 && wordCount >= 2 && !hasMarker && !hasColon) {
      if (!names.includes(trimmed)) {
        names.push(trimmed);
      }
    }
    break; // Only check first non-empty line
  }

  return dedupe(names);
}

// --- DOB Extraction ---

const DOB_PATTERNS = [
  /(?:DOB|Date of Birth|Born|D\.O\.B)\s*:?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})/gi,
  /(?:DOB|Date of Birth|Born|D\.O\.B)\s*:?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})/gi,
];

function extractDobs(text: string): string[] {
  const results: string[] = [];
  for (const pattern of DOB_PATTERNS) {
    results.push(...matchAll(text, pattern));
  }
  return dedupe(results);
}

// --- Medicare Extraction ---

const MEDICARE_PATTERNS = [
  /(?:Medicare|Medicare No|Medicare Number)\s*:?\s*#?\s*(\d{4}\s?\d{5,6}\s?\d{1})/gi,
  /(?:Medicare|Medicare No|Medicare Number)\s*:?\s*#?\s*(\d{10,11})/gi,
];

function extractMedicare(text: string): string[] {
  const results: string[] = [];
  for (const pattern of MEDICARE_PATTERNS) {
    results.push(...matchAll(text, pattern));
  }
  return dedupe(results);
}

// --- Phone Extraction ---

const PHONE_LABELED_PATTERNS = [
  // Australian mobile with label
  /(?:Phone|Ph|Mobile|Mob|Cell|Contact)\s*:?\s*(04\d{2}\s?\d{3}\s?\d{3})/gi,
  /(?:Phone|Ph|Mobile|Mob|Cell|Contact)\s*:?\s*(04\d{8})/gi,
  // Australian landline with label
  /(?:Phone|Ph|Home|Work)\s*:?\s*(\(?0[2-9]\)?\s?\d{4}\s?\d{4})/gi,
];

const PHONE_STANDALONE_PATTERNS = [
  // Standalone mobile
  /(?:^|\s)(04\d{2}\s\d{3}\s\d{3})(?:\s|$)/gm,
  // Standalone landline
  /(?:^|\s)(\(0[2-9]\)\s?\d{4}\s?\d{4})(?:\s|$)/gm,
];

function extractPhones(text: string): string[] {
  const results: string[] = [];
  for (const pattern of PHONE_LABELED_PATTERNS) {
    results.push(...matchAll(text, pattern));
  }
  for (const pattern of PHONE_STANDALONE_PATTERNS) {
    results.push(...matchAll(text, pattern));
  }
  return dedupe(results);
}

// --- Email Extraction ---

const EMAIL_LABELED = /(?:Email|E-mail)\s*:?\s*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})/gi;
const EMAIL_STANDALONE = /(?:^|\s)([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})(?:\s|$)/gm;

function extractEmails(text: string): string[] {
  const results: string[] = [];
  results.push(...matchAll(text, EMAIL_LABELED));
  results.push(...matchAll(text, EMAIL_STANDALONE));
  return dedupe(results);
}

// --- Address Extraction ---

const AU_STATES = "NSW|VIC|QLD|SA|WA|TAS|NT|ACT";

const ADDRESS_LABELED = new RegExp(
  `(?:Address|Addr)\\s*:\\s*(.+?(?:${AU_STATES})\\s+\\d{4})`,
  "gi"
);

const ADDRESS_STANDALONE = new RegExp(
  `(?:^|\\n)(.+?\\b(?:${AU_STATES})\\s+\\d{4})`,
  "gm"
);

function extractAddresses(text: string): string[] {
  const results: string[] = [];
  results.push(...matchAll(text, ADDRESS_LABELED));

  // Standalone: only match lines that look like addresses (contain a number or street-type word)
  const standaloneMatches = matchAll(text, ADDRESS_STANDALONE);
  for (const m of standaloneMatches) {
    const trimmed = m.trim();
    // Filter out lines that are clearly not addresses (too short, or just a state+postcode)
    if (trimmed.length > 10 && /\d/.test(trimmed)) {
      results.push(trimmed);
    }
  }

  return dedupe(results);
}

// --- Main Parser ---

/**
 * Parse raw PHI text input into structured entities.
 * Never throws — returns empty arrays for all fields on failure.
 */
export function parsePhi(rawInput: string): ParsedPhi {
  const empty: ParsedPhi = {
    names: [],
    dobs: [],
    phones: [],
    medicareNumbers: [],
    emails: [],
    addresses: [],
  };

  try {
    if (!rawInput || !rawInput.trim()) {
      return empty;
    }

    return {
      names: extractNames(rawInput),
      dobs: extractDobs(rawInput),
      phones: extractPhones(rawInput),
      medicareNumbers: extractMedicare(rawInput),
      emails: extractEmails(rawInput),
      addresses: extractAddresses(rawInput),
    };
  } catch {
    // Graceful fallback — never throw from PHI parser
    return empty;
  }
}
