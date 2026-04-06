"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { retryAllFailed } from "./actions";

export function RetryAllButton({ count }: { count: number }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const router = useRouter();

  async function handleRetry() {
    if (!confirm(`Retry all ${count} failed delivery jobs?`)) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await retryAllFailed();
      if (res.success) {
        setResult(`Retried ${res.retried} job${res.retried !== 1 ? "s" : ""}`);
        router.refresh();
      } else {
        setResult(res.error || "Failed to retry");
      }
    } catch {
      setResult("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span className="text-xs text-muted-foreground">{result}</span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleRetry}
        disabled={loading}
      >
        {loading ? "Retrying..." : "Retry All Failed"}
      </Button>
    </div>
  );
}
