"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Provider {
  id: string;
  doctorName: string;
  providerNumber: string;
  location: string;
}

interface ProviderSelectProps {
  providers: Provider[];
  value: string;
  onChange: (value: string) => void;
  defaultProviderId?: string;
  error?: string;
}

export function ProviderSelect({
  providers,
  value,
  onChange,
  defaultProviderId,
  error,
}: ProviderSelectProps) {
  // Auto-select default provider on mount
  React.useEffect(() => {
    if (!value && defaultProviderId) {
      onChange(defaultProviderId);
    }
  }, [defaultProviderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group providers by doctor name
  const grouped = React.useMemo(() => {
    const groups: Record<string, Provider[]> = {};
    for (const p of providers) {
      if (!groups[p.doctorName]) groups[p.doctorName] = [];
      groups[p.doctorName].push(p);
    }
    return groups;
  }, [providers]);

  return (
    <div className="space-y-1">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={error ? "border-destructive" : undefined}>
          <SelectValue placeholder="Select referring provider..." />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(grouped).map(([doctorName, group]) => (
            <SelectGroup key={doctorName}>
              <SelectLabel>Dr {doctorName}</SelectLabel>
              {group.map((provider) => (
                <SelectItem key={provider.id} value={provider.id}>
                  <span>{provider.location}</span>
                  <span className="ml-2 text-muted-foreground text-xs">
                    ({provider.providerNumber})
                  </span>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
