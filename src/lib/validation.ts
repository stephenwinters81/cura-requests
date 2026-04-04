import { z } from "zod";
import { EXAM_TYPES } from "@/lib/types";

// --- Manual Practice Schema ---

export const manualPracticeSchema = z.object({
  name: z.string().min(1, "Practice name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

// --- Practice Schema (admin management) ---

export const practiceSchema = z
  .object({
    name: z.string().min(1, "Practice name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
    fax: z.string().optional(),
    email: z.string().email("Invalid email address").optional().or(z.literal("")),
  })
  .refine((data) => data.email || data.fax, {
    message: "At least an email or fax number is required",
    path: ["email"],
  });

// --- Imaging Request Schema ---

export const imagingRequestSchema = z
  .object({
    practiceId: z.string().optional(),
    manualPractice: manualPracticeSchema.optional(),
    rawPhiInput: z.string().min(1, "Patient details are required").max(10000),
    examType: z.string().min(1, "Exam type is required"),
    examOther: z.string().optional(),
    clinicalDetails: z.string().min(1, "Clinical details are required"),
    contrastReaction: z.enum(["yes", "no"], {
      message: "Contrast reaction must be specified",
    }),
    egfr: z.string().optional(),
    providerId: z.string().min(1, "Provider is required"),
    reportByRadiologistId: z.string().optional(),
    patientEmail: z.string().email("Invalid patient email").optional().or(z.literal("")),
    sendToPatient: z.boolean().default(false),
    deliveryMethod: z.enum(["email", "fax", "both"]).optional(),
  })
  .refine((data) => data.practiceId || data.manualPractice, {
    message: "Either select a practice or enter details manually",
    path: ["practiceId"],
  })
  .refine((data) => data.examType !== "Other" || (data.examOther && data.examOther.length > 0), {
    message: "Please specify the exam type",
    path: ["examOther"],
  })
  .refine((data) => !data.sendToPatient || (data.patientEmail && data.patientEmail.length > 0), {
    message: "Patient email is required when sending to patient",
    path: ["patientEmail"],
  });

// --- Provider Schema (settings management) ---

export const providerSchema = z.object({
  providerNumber: z.string().min(1, "Provider number is required"),
  location: z.string().min(1, "Clinic name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  fax: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
});

// --- User Schema ---

export const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["admin", "staff"]),
  defaultProviderId: z.string().optional(),
});

// --- Password Change Schema ---

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// --- Login Schema ---

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// --- MFA Schema ---

export const mfaSchema = z.object({
  code: z
    .string()
    .length(6, "MFA code must be 6 digits")
    .regex(/^\d{6}$/, "MFA code must be numeric"),
});

// --- API Key Create Schema ---

export const apiKeyCreateSchema = z.object({
  name: z.string().min(1, "API key name is required").max(100),
  userId: z.string().min(1, "User is required"),
  scopes: z
    .array(z.enum(["requests:write", "requests:read", "practices:read", "practices:write", "providers:read"]))
    .min(1, "At least one scope is required"),
  webhookUrl: z.string().url("Invalid webhook URL").optional().or(z.literal("")),
  allowedIps: z.array(z.string()).optional().default([]),
  expiresAt: z.string().datetime().optional().or(z.literal("")),
});

// Re-export exam types for validation
export const examTypeValues = EXAM_TYPES;
