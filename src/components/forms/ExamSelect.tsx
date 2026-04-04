"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { EXAM_TYPES } from "@/lib/types";

interface ExamSelectProps {
  value: string;
  onChange: (value: string) => void;
  examOther: string;
  onExamOtherChange: (value: string) => void;
  error?: string;
  examOtherError?: string;
}

export function ExamSelect({
  value,
  onChange,
  examOther,
  onExamOtherChange,
  error,
  examOtherError,
}: ExamSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const filtered = EXAM_TYPES.filter((t) =>
    t.toLowerCase().includes(search.toLowerCase())
  );

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[highlightIndex]) {
        handleSelect(filtered[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSelect(examType: string) {
    onChange(examType);
    setSearch("");
    setOpen(false);
  }

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-exam-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  return (
    <div className="space-y-2">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
              !value && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            {value || "Select exam type..."}
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
              className="ml-2 opacity-50"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content
            className="z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover p-0 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={4}
            align="start"
          >
            <div className="p-2">
              <Input
                placeholder="Search exam types..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-8"
              />
            </div>

            <div
              ref={listRef}
              className="max-h-[240px] overflow-y-auto"
              role="listbox"
            >
              {filtered.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No exam types found.
                </div>
              )}

              {filtered.map((examType, i) => (
                <div
                  key={examType}
                  data-exam-item
                  role="option"
                  aria-selected={examType === value}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center px-3 py-1.5 text-sm outline-none",
                    highlightIndex === i && "bg-accent text-accent-foreground",
                    examType === value && "font-medium",
                    examType === "Other" && "border-t mt-1 pt-2"
                  )}
                  onClick={() => handleSelect(examType)}
                  onMouseEnter={() => setHighlightIndex(i)}
                >
                  <span className="flex-1">{examType}</span>
                  {examType === value && (
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
                      className="text-primary"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {value === "Other" && (
        <div className="mt-2">
          <Input
            placeholder="Specify exam type..."
            value={examOther}
            onChange={(e) => onExamOtherChange(e.target.value)}
            className={cn(examOtherError && "border-destructive")}
            autoFocus
          />
          {examOtherError && (
            <p className="mt-1 text-xs text-destructive">{examOtherError}</p>
          )}
        </div>
      )}
    </div>
  );
}
