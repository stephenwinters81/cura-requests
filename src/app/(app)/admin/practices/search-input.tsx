"use client";

import { useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";

interface PracticeSearchInputProps {
  defaultValue: string;
}

export function PracticeSearchInput({ defaultValue }: PracticeSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      startTransition(() => {
        const params = new URLSearchParams();
        if (value.trim()) {
          params.set("search", value.trim());
        }
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    },
    [router, pathname]
  );

  return (
    <div className="relative">
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
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <Input
        type="search"
        placeholder="Search practices by name..."
        defaultValue={defaultValue}
        onChange={handleChange}
        className={`pl-9 ${isPending ? "opacity-70" : ""}`}
      />
    </div>
  );
}
