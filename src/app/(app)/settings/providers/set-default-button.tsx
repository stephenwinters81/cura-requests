"use client";

import { Button } from "@/components/ui/button";
import { setDefaultProvider } from "./actions";

export function SetDefaultButton({ providerId }: { providerId: string }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground"
      onClick={async () => {
        await setDefaultProvider(providerId);
      }}
    >
      Set default
    </Button>
  );
}
