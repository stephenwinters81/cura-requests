"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FiltersProps {
  providers: { id: string; doctorName: string; location: string }[];
}

export function RequestFilters({ providers }: FiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // Reset page on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  const clearFilters = useCallback(() => {
    startTransition(() => {
      router.push(pathname);
    });
  }, [router, pathname]);

  const hasFilters =
    searchParams.has("status") ||
    searchParams.has("providerId") ||
    searchParams.has("search") ||
    searchParams.has("dateFrom") ||
    searchParams.has("dateTo");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Search
        </label>
        <Input
          placeholder="Patient name..."
          defaultValue={searchParams.get("search") ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            // Debounce manually with timeout
            const timeout = setTimeout(() => updateParam("search", val), 400);
            return () => clearTimeout(timeout);
          }}
          className="h-8 text-sm"
        />
      </div>

      {/* Status */}
      <div className="min-w-[140px]">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Status
        </label>
        <select
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={searchParams.get("status") ?? ""}
          onChange={(e) => updateParam("status", e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="delivered">Delivered</option>
          <option value="partial">Partial</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Provider */}
      <div className="min-w-[180px]">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          Provider
        </label>
        <select
          className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          defaultValue={searchParams.get("providerId") ?? ""}
          onChange={(e) => updateParam("providerId", e.target.value)}
        >
          <option value="">All providers</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              Dr {p.doctorName} — {p.location}
            </option>
          ))}
        </select>
      </div>

      {/* Date From */}
      <div className="min-w-[140px]">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          From
        </label>
        <Input
          type="date"
          defaultValue={searchParams.get("dateFrom") ?? ""}
          onChange={(e) => updateParam("dateFrom", e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Date To */}
      <div className="min-w-[140px]">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
          To
        </label>
        <Input
          type="date"
          defaultValue={searchParams.get("dateTo") ?? ""}
          onChange={(e) => updateParam("dateTo", e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          disabled={isPending}
          className="text-xs text-muted-foreground self-end"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
