"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface Practice {
  id: string;
  name: string;
}

interface Props {
  practices: Practice[];
  selected: string[];
}

export function PracticeCheckboxList({ practices, selected }: Props) {
  const [search, setSearch] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(selected)
  );

  const filtered = search
    ? practices.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : practices;

  function toggle(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <Input
        placeholder="Search practices..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="max-h-[240px] overflow-y-auto rounded-md border p-2 space-y-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No practices found
          </p>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="flex items-center gap-2 py-0.5">
              <Checkbox
                id={`practice-${p.id}`}
                checked={checkedIds.has(p.id)}
                onCheckedChange={() => toggle(p.id)}
              />
              <Label
                htmlFor={`practice-${p.id}`}
                className="text-sm font-normal cursor-pointer"
              >
                {p.name}
              </Label>
              {checkedIds.has(p.id) && (
                <input type="hidden" name="practiceIds" value={p.id} />
              )}
            </div>
          ))
        )}
      </div>
      {checkedIds.size > 0 && (
        <p className="text-xs text-muted-foreground">
          {checkedIds.size} practice{checkedIds.size !== 1 ? "s" : ""} selected
        </p>
      )}
    </div>
  );
}
