/**
 * Canonical types for the practice addition pipeline.
 */

export interface PracticeFormData {
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  email?: string;
}

export interface PracticeLookupResult extends PracticeFormData {
  source: "manual" | "ai_search";
  confidence?: number;
}

export interface DuplicateMatch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  matchReason: string;
}

export interface PracticeRecord {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  usageCount: number;
}
