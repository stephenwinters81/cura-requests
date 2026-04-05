"use client";

import { useAddPractice } from "./use-add-practice";
import {
  ModeSelect,
  ManualEntryForm,
  AiSearchStep,
  AiResultsStep,
  DuplicateCheckStep,
  ReviewConfirmStep,
} from "./steps";
import type { PracticeRecord } from "@/lib/practices/types";

interface AddPracticeFlowProps {
  onComplete: (practice: PracticeRecord) => void;
  onCancel: () => void;
}

export function AddPracticeFlow({ onComplete, onCancel }: AddPracticeFlowProps) {
  const practice = useAddPractice(onComplete);

  switch (practice.step) {
    case "mode-select":
      return (
        <ModeSelect
          onManual={practice.startManual}
          onAiSearch={practice.startAiSearch}
        />
      );

    case "manual-entry":
      return (
        <ManualEntryForm
          formData={practice.formData}
          errors={practice.validationErrors}
          loading={practice.duplicateLoading}
          onUpdate={practice.updateFormData}
          onSubmit={practice.submitForReview}
          onBack={practice.goBack}
        />
      );

    case "ai-search":
      return (
        <AiSearchStep
          query={practice.aiQuery}
          loading={practice.aiLoading}
          error={practice.aiError}
          onQueryChange={practice.setAiQuery}
          onSearch={practice.runAiSearch}
          onBack={practice.goBack}
        />
      );

    case "ai-results":
      return (
        <AiResultsStep
          results={practice.aiResults}
          onSelect={practice.selectAiResult}
          onBack={practice.goBack}
        />
      );

    case "duplicate-check":
      return (
        <DuplicateCheckStep
          duplicates={practice.duplicates}
          onSelectExisting={practice.selectExisting}
          onCreateNew={practice.confirmCreateNew}
          onBack={practice.goBack}
        />
      );

    case "review":
    case "saving":
      return (
        <ReviewConfirmStep
          formData={practice.formData}
          saving={practice.step === "saving"}
          error={practice.saveError}
          onConfirm={practice.confirmCreate}
          onBack={practice.goBack}
        />
      );

    default:
      return null;
  }
}
