import { z } from "zod";
import type { PracticeFormData } from "./types";

// --- Australian phone/fax display formatting ---

/**
 * Formats an Australian phone/fax number to display format: "0X XXXX XXXX".
 * Handles inputs like "(02) 9999-1234", "029999 1234", "+61299991234", "1300 123 456".
 * Returns the original string if it can't be parsed.
 */
export function formatAustralianNumber(raw: string): string {
  const cleaned = raw.replace(/[\s\-()]/g, "");

  let digits: string;

  if (cleaned.startsWith("+61")) {
    digits = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("0061")) {
    digits = "0" + cleaned.slice(4);
  } else if (/^\d{8}$/.test(cleaned)) {
    // 8-digit local number — assume 02 (NSW/ACT)
    digits = "02" + cleaned;
  } else {
    digits = cleaned;
  }

  // 1300/1800 numbers: "1300 XXX XXX" or "1800 XXX XXX"
  if (/^1[38]00\d{6}$/.test(digits)) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  // Standard 10-digit Australian: "0X XXXX XXXX"
  if (/^0\d{9}$/.test(digits)) {
    return `${digits.slice(0, 2)} ${digits.slice(2, 6)} ${digits.slice(6)}`;
  }

  // Can't parse — return original
  return raw;
}

// --- Zod schema for practice form data ---

export const practiceFormSchema = z
  .object({
    name: z.string().min(1, "Practice name is required"),
    address: z.string().optional().default(""),
    phone: z.string().optional().default(""),
    fax: z.string().optional().default(""),
    email: z
      .string()
      .email("Invalid email address")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.email || data.fax, {
    message: "At least an email or fax number is required for delivery",
    path: ["email"],
  });

// --- Validate and normalize practice data for save ---

export interface ValidationResult {
  valid: true;
  data: PracticeFormData;
}

export interface ValidationError {
  valid: false;
  errors: Record<string, string>;
}

export function validateAndNormalize(
  raw: PracticeFormData
): ValidationResult | ValidationError {
  const result = practiceFormSchema.safeParse(raw);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
    return { valid: false, errors };
  }

  const data = result.data;

  return {
    valid: true,
    data: {
      name: data.name.trim(),
      address: data.address?.trim() || undefined,
      phone: data.phone ? formatAustralianNumber(data.phone) : undefined,
      fax: data.fax ? formatAustralianNumber(data.fax) : undefined,
      email: data.email?.trim().toLowerCase() || undefined,
    },
  };
}
