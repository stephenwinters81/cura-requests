"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface PhiTextareaProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  error?: string;
}

export function PhiTextarea({
  value,
  onChange,
  maxLength = 10000,
  error,
}: PhiTextareaProps) {
  const charCount = value.length;
  const nearLimit = charCount > maxLength * 0.9;
  const atLimit = charCount >= maxLength;

  return (
    <div className="space-y-1">
      <Textarea
        value={value}
        onChange={(e) => {
          if (e.target.value.length <= maxLength) {
            onChange(e.target.value);
          }
        }}
        placeholder={"Paste patient details here\nName, DOB, Phone, Medicare, Address..."}
        className={cn(
          "min-h-[160px] font-mono text-sm",
          error && "border-destructive"
        )}
        maxLength={maxLength}
      />
      <div className="flex items-center justify-between">
        {error ? (
          <p className="text-xs text-destructive">{error}</p>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "text-xs tabular-nums",
            atLimit
              ? "text-destructive font-medium"
              : nearLimit
                ? "text-destructive/70"
                : "text-muted-foreground"
          )}
        >
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
