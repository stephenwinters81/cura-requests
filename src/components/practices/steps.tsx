"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PracticeFormData, PracticeLookupResult, DuplicateMatch } from "@/lib/practices/types";
import { formatAustralianNumber } from "@/lib/practices/validation";

// --- Mode Select ---

interface ModeSelectProps {
  onManual: () => void;
  onAiSearch: () => void;
}

export function ModeSelect({ onManual, onAiSearch }: ModeSelectProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        How would you like to add the practice?
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onManual}
          className="flex flex-col items-start gap-2 rounded-lg border border-input p-4 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              <path d="m15 5 4 4" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium">Enter manually</div>
            <div className="text-xs text-muted-foreground">
              Type the practice details yourself
            </div>
          </div>
        </button>
        <button
          type="button"
          onClick={onAiSearch}
          className="flex flex-col items-start gap-2 rounded-lg border border-input p-4 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-medium">Search online</div>
            <div className="text-xs text-muted-foreground">
              AI finds the practice details for you
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

// --- Manual Entry Form ---

interface ManualEntryFormProps {
  formData: PracticeFormData;
  errors: Record<string, string>;
  loading: boolean;
  onUpdate: (updates: Partial<PracticeFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function ManualEntryForm({
  formData,
  errors,
  loading,
  onUpdate,
  onSubmit,
  onBack,
}: ManualEntryFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="practice-name">Practice name *</Label>
          <Input
            id="practice-name"
            value={formData.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="e.g. Sydney Radiology Group"
            className={errors.name ? "border-destructive" : ""}
            autoFocus
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name}</p>
          )}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="practice-address">Address</Label>
          <Input
            id="practice-address"
            value={formData.address ?? ""}
            onChange={(e) => onUpdate({ address: e.target.value })}
            placeholder="Full street address"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="practice-phone">Phone</Label>
          <Input
            id="practice-phone"
            value={formData.phone ?? ""}
            onChange={(e) => onUpdate({ phone: e.target.value })}
            placeholder="02 XXXX XXXX"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="practice-fax">Fax</Label>
          <Input
            id="practice-fax"
            value={formData.fax ?? ""}
            onChange={(e) => onUpdate({ fax: e.target.value })}
            placeholder="02 XXXX XXXX"
            className={errors.fax ? "border-destructive" : ""}
          />
          {errors.fax && (
            <p className="text-xs text-destructive">{errors.fax}</p>
          )}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="practice-email">Email</Label>
          <Input
            id="practice-email"
            type="email"
            value={formData.email ?? ""}
            onChange={(e) => onUpdate({ email: e.target.value })}
            placeholder="referrals@practice.com.au"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email}</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        At least an email or fax number is required for delivery.
      </p>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onSubmit} disabled={loading || !formData.name.trim()}>
          {loading ? "Checking..." : "Continue"}
        </Button>
      </div>
    </div>
  );
}

// --- AI Search Step ---

interface AiSearchStepProps {
  query: string;
  loading: boolean;
  error: string | null;
  onQueryChange: (query: string) => void;
  onSearch: () => void;
  onBack: () => void;
}

export function AiSearchStep({
  query,
  loading,
  error,
  onQueryChange,
  onSearch,
  onBack,
}: AiSearchStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Enter the practice name and we&apos;ll search for their contact details.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="ai-search">Practice name or location</Label>
        <div className="flex gap-2">
          <Input
            id="ai-search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g. I-MED Radiology Drummoyne"
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim().length >= 3) {
                e.preventDefault();
                onSearch();
              }
            }}
            autoFocus
          />
          <Button
            type="button"
            onClick={onSearch}
            disabled={loading || query.trim().length < 3}
          >
            {loading ? (
              <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              "Search"
            )}
          </Button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Searching Australian radiology practices...
        </div>
      )}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          Enter manually instead
        </Button>
      </div>
    </div>
  );
}

// --- AI Results Step ---

interface AiResultsStepProps {
  results: PracticeLookupResult[];
  onSelect: (index: number) => void;
  onBack: () => void;
}

export function AiResultsStep({ results, onSelect, onBack }: AiResultsStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {results.length} result{results.length !== 1 ? "s" : ""} found. Select one to continue.
      </p>
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {results.map((result, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className="w-full rounded-lg border border-input p-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <div className="text-sm font-medium">{result.name}</div>
            {result.address && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {result.address}
              </div>
            )}
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
              {result.fax && <span>Fax: {result.fax}</span>}
              {result.email && <span>Email: {result.email}</span>}
              {result.phone && <span>Ph: {result.phone}</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back to search
        </Button>
      </div>
    </div>
  );
}

// --- Duplicate Check Step ---

interface DuplicateCheckStepProps {
  duplicates: DuplicateMatch[];
  onSelectExisting: (practice: DuplicateMatch) => void;
  onCreateNew: () => void;
  onBack: () => void;
}

export function DuplicateCheckStep({
  duplicates,
  onSelectExisting,
  onCreateNew,
  onBack,
}: DuplicateCheckStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
        We found similar practices already in the system. Would you like to use
        one of these instead?
      </div>
      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {duplicates.map((dup) => (
          <button
            key={dup.id}
            type="button"
            onClick={() => onSelectExisting(dup)}
            className="w-full rounded-lg border border-input p-3 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{dup.name}</div>
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                {dup.matchReason}
              </span>
            </div>
            {dup.address && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {dup.address}
              </div>
            )}
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
              {dup.fax && <span>Fax: {dup.fax}</span>}
              {dup.email && <span>Email: {dup.email}</span>}
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button type="button" variant="outline" onClick={onCreateNew}>
          None of these &mdash; create new
        </Button>
      </div>
    </div>
  );
}

// --- Review & Confirm Step ---

interface ReviewConfirmStepProps {
  formData: PracticeFormData;
  saving: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}

export function ReviewConfirmStep({
  formData,
  saving,
  error,
  onConfirm,
  onBack,
}: ReviewConfirmStepProps) {
  const normalizedFax = formData.fax
    ? formatAustralianNumber(formData.fax)
    : null;
  const normalizedPhone = formData.phone
    ? formatAustralianNumber(formData.phone)
    : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Review the details below. Phone and fax numbers will be auto-formatted.
      </p>
      <div className="rounded-lg border border-input p-4 space-y-3">
        <div>
          <div className="text-xs text-muted-foreground">Practice Name</div>
          <div className="text-sm font-medium">{formData.name}</div>
        </div>
        {formData.address && (
          <div>
            <div className="text-xs text-muted-foreground">Address</div>
            <div className="text-sm">{formData.address}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {normalizedPhone && (
            <div>
              <div className="text-xs text-muted-foreground">Phone</div>
              <div className="text-sm">{normalizedPhone}</div>
            </div>
          )}
          {normalizedFax && (
            <div>
              <div className="text-xs text-muted-foreground">Fax</div>
              <div className="text-sm">{normalizedFax}</div>
            </div>
          )}
        </div>
        {formData.email && (
          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="text-sm">{formData.email}</div>
          </div>
        )}

        {!formData.fax && !formData.email && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
            At least an email or fax is required for delivery.
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={saving || (!formData.fax && !formData.email)}
        >
          {saving ? "Creating..." : "Confirm & Add"}
        </Button>
      </div>
    </div>
  );
}
