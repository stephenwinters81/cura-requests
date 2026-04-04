"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PracticeCombobox } from "@/components/forms/PracticeCombobox";
import { ExamSelect } from "@/components/forms/ExamSelect";
import { ProviderSelect } from "@/components/forms/ProviderSelect";
import { PhiTextarea } from "@/components/forms/PhiTextarea";
import { imagingRequestSchema } from "@/lib/validation";
import { submitImagingRequest, checkDuplicate } from "./actions";
import type { ManualPractice } from "@/lib/types";

// --- Types ---

interface Practice {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  usageCount: number;
}

interface Provider {
  id: string;
  doctorName: string;
  providerNumber: string;
  location: string;
}

interface Radiologist {
  id: string;
  name: string;
  practices: { id: string }[];
}

interface FormProps {
  practices: Practice[];
  providers: Provider[];
  radiologists: Radiologist[];
  defaultProviderId?: string;
  userName: string;
}

interface FormState {
  practiceId: string;
  manualMode: boolean;
  manualPractice: ManualPractice;
  rawPhiInput: string;
  examType: string;
  examOther: string;
  clinicalDetails: string;
  contrastReaction: "" | "yes" | "no";
  egfr: string;
  providerId: string;
  reportByRadiologistId: string;
  sendToPatient: boolean;
  patientEmail: string;
}

const DRAFT_KEY = "imaging-request-draft";

const initialState: FormState = {
  practiceId: "",
  manualMode: false,
  manualPractice: { name: "", address: "", phone: "", fax: "", email: "" },
  rawPhiInput: "",
  examType: "",
  examOther: "",
  clinicalDetails: "",
  contrastReaction: "",
  egfr: "",
  providerId: "",
  reportByRadiologistId: "",
  sendToPatient: false,
  patientEmail: "",
};

// --- Auto-save Hook ---

function useAutoSave(state: FormState, enabled: boolean) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(state));
      } catch {
        // localStorage may be full or unavailable
      }
    }, 500);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, enabled]);
}

function loadDraft(): FormState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Validate shape loosely
    if (typeof parsed === "object" && parsed !== null && "rawPhiInput" in parsed) {
      return parsed as FormState;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore
  }
}

// --- Component ---

export function ImagingRequestForm({
  practices,
  providers,
  radiologists,
  defaultProviderId,
  userName,
}: FormProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [draftRestored, setDraftRestored] = React.useState(false);
  const [duplicateDialog, setDuplicateDialog] = React.useState(false);
  const [duplicateTime, setDuplicateTime] = React.useState<string>();
  const formRef = React.useRef<HTMLFormElement>(null);

  // Auto-save
  useAutoSave(form, !submitting);

  // Restore draft on mount
  React.useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setForm(draft);
      setDraftRestored(true);
      // Auto-dismiss after 4 seconds
      setTimeout(() => setDraftRestored(false), 4000);
    }
  }, []);

  // Auto-select default provider
  React.useEffect(() => {
    if (!form.providerId && defaultProviderId) {
      setForm((prev) => ({ ...prev, providerId: defaultProviderId }));
    }
  }, [defaultProviderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Field Updaters ---

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear field error on change
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  // --- Validation ---

  function validateForm(): boolean {
    const data = buildSubmitData();
    const result = imagingRequestSchema.safeParse(data);
    if (result.success) {
      setErrors({});
      return true;
    }

    const newErrors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".");
      if (!newErrors[key]) {
        newErrors[key] = issue.message;
      }
    }
    setErrors(newErrors);
    return false;
  }

  function buildSubmitData() {
    return {
      practiceId: form.manualMode ? undefined : form.practiceId || undefined,
      manualPractice: form.manualMode ? form.manualPractice : undefined,
      rawPhiInput: form.rawPhiInput,
      examType: form.examType,
      examOther: form.examOther || undefined,
      clinicalDetails: form.clinicalDetails,
      contrastReaction: form.contrastReaction || undefined,
      egfr: form.egfr || undefined,
      providerId: form.providerId,
      reportByRadiologistId: form.reportByRadiologistId || undefined,
      sendToPatient: form.sendToPatient,
      patientEmail: form.patientEmail || undefined,
    };
  }

  // --- Submit ---

  async function handleSubmit(force = false) {
    if (!validateForm()) return;

    setSubmitting(true);

    try {
      // Duplicate check (unless forcing)
      if (!force && form.rawPhiInput.trim() && form.examType) {
        const firstLine = form.rawPhiInput.trim().split("\n")[0];
        const dup = await checkDuplicate(firstLine, form.examType);
        if (dup.isDuplicate) {
          setDuplicateTime(dup.existingRequestTime);
          setDuplicateDialog(true);
          setSubmitting(false);
          return;
        }
      }

      const data = buildSubmitData();
      const result = await submitImagingRequest(data);

      if (result.success) {
        clearDraft();
        router.push(`/requests?created=${result.requestId}`);
      } else {
        if (result.fieldErrors) {
          const newErrors: Record<string, string> = {};
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            newErrors[key] = messages[0];
          }
          setErrors(newErrors);
        } else {
          setErrors({ _form: result.error ?? "Submission failed" });
        }
      }
    } catch {
      setErrors({ _form: "An unexpected error occurred. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function formatDuplicateTime(iso?: string): string {
    if (!iso) return "recently";
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("en-AU", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "recently";
    }
  }

  return (
    <>
      {/* Draft Restored Toast */}
      {draftRestored && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in-0 rounded-md border bg-card px-4 py-3 text-sm shadow-lg">
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-primary"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <span>Draft restored</span>
            <button
              type="button"
              className="ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => setDraftRestored(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-6"
        noValidate
      >
        {/* Global error */}
        {errors._form && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {errors._form}
          </div>
        )}

        {/* --- Section 1: Where to Send --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect width="7" height="5" x="7" y="7" rx="1" />
                <rect width="7" height="5" x="10" y="12" rx="1" />
              </svg>
              Where to send
            </CardTitle>
            <CardDescription>
              Select the radiology practice to receive this request.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PracticeCombobox
              practices={practices}
              value={form.practiceId}
              onSelect={(id) => {
                updateField("practiceId", id);
                updateField("reportByRadiologistId", "");
              }}
              manualMode={form.manualMode}
              onManualModeChange={(manual) => updateField("manualMode", manual)}
              manualPractice={form.manualPractice}
              onManualPracticeChange={(mp) => updateField("manualPractice", mp)}
              error={errors.practiceId}
              autoFocus
            />

            {/* Preferred Radiologist — shown when practice has linked radiologists */}
            {(() => {
              const available = form.practiceId
                ? radiologists.filter((r) =>
                    r.practices.some((p) => p.id === form.practiceId)
                  )
                : [];
              if (available.length === 0) return null;
              return (
                <div className="mt-3 space-y-1.5">
                  <Label>Preferred reporting radiologist</Label>
                  <select
                    value={form.reportByRadiologistId}
                    onChange={(e) =>
                      updateField("reportByRadiologistId", e.target.value)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">No preference</option>
                    {available.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* --- Section 2: Patient Information --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
              </svg>
              Patient Information
            </CardTitle>
            <CardDescription>
              Paste the patient&apos;s details. Name, DOB, phone, Medicare number, and address will be parsed automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PhiTextarea
              value={form.rawPhiInput}
              onChange={(val) => {
                updateField("rawPhiInput", val);
                // Auto-detect email in patient details and populate patient email
                const emailMatch = val.match(
                  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
                );
                if (emailMatch && !form.patientEmail) {
                  updateField("patientEmail", emailMatch[0]);
                  updateField("sendToPatient", true);
                }
              }}
              error={errors.rawPhiInput}
            />
          </CardContent>
        </Card>

        {/* --- Section 3: Request Details --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Exam Type */}
            <div className="space-y-1.5">
              <Label>Exam type *</Label>
              <ExamSelect
                value={form.examType}
                onChange={(val) => updateField("examType", val)}
                examOther={form.examOther}
                onExamOtherChange={(val) => updateField("examOther", val)}
                error={errors.examType}
                examOtherError={errors.examOther}
              />
            </div>

            {/* Clinical Details */}
            <div className="space-y-1.5">
              <Label htmlFor="clinical-details">Clinical details *</Label>
              <Textarea
                id="clinical-details"
                value={form.clinicalDetails}
                onChange={(e) => updateField("clinicalDetails", e.target.value)}
                placeholder="Relevant clinical history, indication for imaging..."
                className={`min-h-[80px] ${errors.clinicalDetails ? "border-destructive" : ""}`}
              />
              {errors.clinicalDetails && (
                <p className="text-xs text-destructive">{errors.clinicalDetails}</p>
              )}
            </div>

            {/* Contrast Reaction + eGFR row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Previous contrast reaction *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={form.contrastReaction === "no" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateField("contrastReaction", "no")}
                  >
                    No
                  </Button>
                  <Button
                    type="button"
                    variant={form.contrastReaction === "yes" ? "destructive" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => updateField("contrastReaction", "yes")}
                  >
                    Yes
                  </Button>
                </div>
                {errors.contrastReaction && (
                  <p className="text-xs text-destructive">{errors.contrastReaction}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="egfr">eGFR</Label>
                <Input
                  id="egfr"
                  value={form.egfr}
                  onChange={(e) => updateField("egfr", e.target.value)}
                  placeholder="e.g. 90"
                  className="max-w-[120px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* --- Section 4: Referring Provider --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Referring Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Provider *</Label>
              <ProviderSelect
                providers={providers}
                value={form.providerId}
                onChange={(val) => updateField("providerId", val)}
                defaultProviderId={defaultProviderId}
                error={errors.providerId}
              />
            </div>

          </CardContent>
        </Card>

        {/* --- Section 5: Patient Copy --- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              Patient Copy
            </CardTitle>
            <CardDescription>
              Optionally email a copy of the request to the patient.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="send-patient"
                checked={form.sendToPatient}
                onCheckedChange={(checked) =>
                  updateField("sendToPatient", checked === true)
                }
              />
              <Label htmlFor="send-patient" className="text-sm font-normal cursor-pointer">
                Send a copy to the patient
              </Label>
            </div>

            {form.sendToPatient && (
              <div className="ml-6 space-y-1.5">
                <Label htmlFor="patient-email">Patient email *</Label>
                <Input
                  id="patient-email"
                  type="email"
                  value={form.patientEmail}
                  onChange={(e) => updateField("patientEmail", e.target.value)}
                  placeholder="patient@example.com"
                  className={errors.patientEmail ? "border-destructive" : ""}
                  autoFocus
                />
                {errors.patientEmail && (
                  <p className="text-xs text-destructive">{errors.patientEmail}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* --- Submit --- */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setForm(initialState);
              clearDraft();
            }}
            disabled={submitting}
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className="min-w-[160px]"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Submitting...
              </span>
            ) : (
              "Submit Request"
            )}
          </Button>
        </div>
      </form>

      {/* --- Duplicate Confirmation Dialog --- */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Possible duplicate request</DialogTitle>
            <DialogDescription>
              A <strong>{form.examType}</strong> request was submitted at{" "}
              <strong>{formatDuplicateTime(duplicateTime)}</strong> today.
              Are you sure you want to submit another?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDuplicateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setDuplicateDialog(false);
                handleSubmit(true);
              }}
            >
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
