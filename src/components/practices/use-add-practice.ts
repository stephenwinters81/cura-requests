"use client";

import { useState, useCallback } from "react";
import type { PracticeFormData, PracticeLookupResult, DuplicateMatch, PracticeRecord } from "@/lib/practices/types";
import { checkPracticeDuplicates, lookupPracticeAI, createPracticeRecord } from "@/app/(app)/practices/actions";

export type AddPracticeStep =
  | "mode-select"
  | "manual-entry"
  | "ai-search"
  | "ai-results"
  | "duplicate-check"
  | "review"
  | "saving";

interface AddPracticeState {
  step: AddPracticeStep;
  formData: PracticeFormData;
  aiQuery: string;
  aiResults: PracticeLookupResult[];
  aiLoading: boolean;
  aiError: string | null;
  duplicates: DuplicateMatch[];
  duplicateLoading: boolean;
  saveError: string | null;
  validationErrors: Record<string, string>;
}

const initialFormData: PracticeFormData = {
  name: "",
  address: "",
  phone: "",
  fax: "",
  email: "",
};

const initialState: AddPracticeState = {
  step: "mode-select",
  formData: { ...initialFormData },
  aiQuery: "",
  aiResults: [],
  aiLoading: false,
  aiError: null,
  duplicates: [],
  duplicateLoading: false,
  saveError: null,
  validationErrors: {},
};

export function useAddPractice(
  onComplete: (practice: PracticeRecord) => void
) {
  const [state, setState] = useState<AddPracticeState>({ ...initialState });

  const updateState = useCallback(
    (updates: Partial<AddPracticeState>) =>
      setState((prev) => ({ ...prev, ...updates })),
    []
  );

  const reset = useCallback(() => {
    setState({ ...initialState });
  }, []);

  const startManual = useCallback(() => {
    updateState({ step: "manual-entry", validationErrors: {} });
  }, [updateState]);

  const startAiSearch = useCallback(() => {
    updateState({ step: "ai-search", aiError: null });
  }, [updateState]);

  const updateFormData = useCallback(
    (updates: Partial<PracticeFormData>) =>
      setState((prev) => ({
        ...prev,
        formData: { ...prev.formData, ...updates },
        validationErrors: {},
      })),
    []
  );

  const setAiQuery = useCallback(
    (query: string) => updateState({ aiQuery: query }),
    [updateState]
  );

  const runAiSearch = useCallback(async () => {
    updateState({ aiLoading: true, aiError: null });
    const { results, error } = await lookupPracticeAI(state.aiQuery);
    updateState({
      aiLoading: false,
      aiResults: results,
      aiError: error || null,
      step: results.length > 0 ? "ai-results" : state.step,
    });
  }, [state.aiQuery, state.step, updateState]);

  const selectAiResult = useCallback(
    async (index: number) => {
      const result = state.aiResults[index];
      if (!result) return;

      const data: PracticeFormData = {
        name: result.name,
        address: result.address || "",
        phone: result.phone || "",
        fax: result.fax || "",
        email: result.email || "",
      };
      updateState({ formData: data, duplicateLoading: true });

      const { duplicates } = await checkPracticeDuplicates(data);
      if (duplicates.length > 0) {
        updateState({ duplicates, duplicateLoading: false, step: "duplicate-check" });
      } else {
        updateState({ duplicates: [], duplicateLoading: false, step: "review" });
      }
    },
    [state.aiResults, updateState]
  );

  const runDuplicateCheck = useCallback(
    async (data?: PracticeFormData) => {
      const checkData = data || state.formData;
      updateState({ duplicateLoading: true });
      const { duplicates } = await checkPracticeDuplicates(checkData);
      if (duplicates.length > 0) {
        updateState({
          duplicates,
          duplicateLoading: false,
          step: "duplicate-check",
        });
      } else {
        updateState({
          duplicates: [],
          duplicateLoading: false,
          step: "review",
        });
      }
    },
    [state.formData, updateState]
  );

  const submitForReview = useCallback(async () => {
    await runDuplicateCheck();
  }, [runDuplicateCheck]);

  const selectExisting = useCallback(
    (practice: DuplicateMatch) => {
      onComplete({
        id: practice.id,
        name: practice.name,
        address: practice.address,
        phone: practice.phone,
        fax: practice.fax,
        email: practice.email,
        usageCount: 0,
      });
    },
    [onComplete]
  );

  const confirmCreateNew = useCallback(() => {
    updateState({ step: "review" });
  }, [updateState]);

  const confirmCreate = useCallback(async () => {
    updateState({ step: "saving", saveError: null });
    const result = await createPracticeRecord(state.formData);
    if (result.success) {
      onComplete(result.practice);
      reset();
    } else {
      updateState({
        step: "review",
        saveError: "Validation failed. Please go back and check the details.",
        validationErrors: result.errors,
      });
    }
  }, [state.formData, onComplete, reset, updateState]);

  const goBack = useCallback(() => {
    switch (state.step) {
      case "manual-entry":
      case "ai-search":
        updateState({ step: "mode-select" });
        break;
      case "ai-results":
        updateState({ step: "ai-search" });
        break;
      case "duplicate-check":
      case "review":
        // Go back to manual or ai-results depending on how we got here
        if (state.aiQuery.length > 0 && state.aiResults.length > 0) {
          updateState({ step: "ai-results" });
        } else {
          updateState({ step: "manual-entry" });
        }
        break;
      default:
        updateState({ step: "mode-select" });
    }
  }, [state.step, state.aiQuery.length, state.aiResults.length, updateState]);

  return {
    ...state,
    reset,
    startManual,
    startAiSearch,
    updateFormData,
    setAiQuery,
    runAiSearch,
    selectAiResult,
    submitForReview,
    selectExisting,
    confirmCreateNew,
    confirmCreate,
    goBack,
  };
}
