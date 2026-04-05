"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { AddPracticeDialog } from "@/components/practices/AddPracticeDialog";
import type { PracticeRecord } from "@/lib/practices/types";

interface Practice {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  usageCount: number;
}

interface PracticeComboboxProps {
  practices: Practice[];
  value: string;
  onSelect: (practiceId: string, practice: Practice | null) => void;
  onPracticeCreated?: (practice: PracticeRecord) => void;
  error?: string;
  autoFocus?: boolean;
}

export function PracticeCombobox({
  practices,
  value,
  onSelect,
  onPracticeCreated,
  error,
  autoFocus = false,
}: PracticeComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [addDialogOpen, setAddDialogOpen] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Auto-focus the trigger button on mount
  React.useEffect(() => {
    if (autoFocus && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [autoFocus]);

  const selectedPractice = practices.find((p) => p.id === value);

  // Split into recent (top 5 by usage) and all, then filter
  const recentIds = new Set(
    [...practices]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map((p) => p.id)
  );

  const filtered = practices.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const recentFiltered = filtered.filter((p) => recentIds.has(p.id));
  const otherFiltered = filtered.filter((p) => !recentIds.has(p.id));

  const flatList = [...recentFiltered, ...otherFiltered];

  React.useEffect(() => {
    setHighlightIndex(0);
  }, [search]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, flatList.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (flatList[highlightIndex]) {
        handleSelect(flatList[highlightIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSelect(practice: Practice) {
    onSelect(practice.id, practice);
    setSearch("");
    setOpen(false);
  }

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-practice-item]");
    items[highlightIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  return (
    <>
      <AddPracticeDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onComplete={(practice) => {
          onSelect(practice.id, practice);
          onPracticeCreated?.(practice);
          setAddDialogOpen(false);
        }}
      />
    <div className="space-y-2">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring",
              !value && "text-muted-foreground",
              error && "border-destructive"
            )}
          >
            {selectedPractice ? selectedPractice.name : "Select a radiology practice..."}
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
            side="bottom"
            sideOffset={4}
            align="start"
            avoidCollisions={false}
          >
            <div className="p-2">
              <Input
                placeholder="Search practices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
                className="h-8"
              />
            </div>

            <div
              ref={listRef}
              className="max-h-[min(240px,40vh)] overflow-y-auto"
              role="listbox"
            >
              {flatList.length === 0 && (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No practices found.
                </div>
              )}

              {recentFiltered.length > 0 && (
                <>
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent
                  </div>
                  {recentFiltered.map((practice, i) => (
                    <div
                      key={practice.id}
                      data-practice-item
                      role="option"
                      aria-selected={practice.id === value}
                      className={cn(
                        "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none",
                        highlightIndex === i && "bg-accent text-accent-foreground",
                        practice.id === value && "font-medium"
                      )}
                      onClick={() => handleSelect(practice)}
                      onMouseEnter={() => setHighlightIndex(i)}
                    >
                      <span className="flex-1">{practice.name}</span>
                      {practice.id === value && (
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
                </>
              )}

              {otherFiltered.length > 0 && (
                <>
                  {recentFiltered.length > 0 && (
                    <div className="-mx-0 my-1 h-px bg-muted" />
                  )}
                  <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    All practices
                  </div>
                  {otherFiltered.map((practice, i) => {
                    const flatIndex = recentFiltered.length + i;
                    return (
                      <div
                        key={practice.id}
                        data-practice-item
                        role="option"
                        aria-selected={practice.id === value}
                        className={cn(
                          "relative flex cursor-pointer select-none items-center px-3 py-2 text-sm outline-none",
                          highlightIndex === flatIndex &&
                            "bg-accent text-accent-foreground",
                          practice.id === value && "font-medium"
                        )}
                        onClick={() => handleSelect(practice)}
                        onMouseEnter={() => setHighlightIndex(flatIndex)}
                      >
                        <span className="flex-1">{practice.name}</span>
                        {practice.id === value && (
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
                    );
                  })}
                </>
              )}
            </div>

            <div className="border-t p-2">
              <button
                type="button"
                className="w-full rounded-sm px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  setOpen(false);
                  setAddDialogOpen(true);
                }}
              >
                Practice not listed? Add new...
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {selectedPractice && (
        <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
          {selectedPractice.address && <div>{selectedPractice.address}</div>}
          <div className="flex gap-4">
            {selectedPractice.fax && <span>Fax: {selectedPractice.fax}</span>}
            {selectedPractice.email && <span>Email: {selectedPractice.email}</span>}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
    </>
  );
}
