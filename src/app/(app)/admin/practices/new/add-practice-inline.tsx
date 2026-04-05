"use client";

import { useRouter } from "next/navigation";
import { AddPracticeFlow } from "@/components/practices/AddPracticeFlow";

export function AddPracticeInline() {
  const router = useRouter();

  return (
    <AddPracticeFlow
      onComplete={() => {
        router.push("/admin/practices");
        router.refresh();
      }}
      onCancel={() => {
        router.push("/admin/practices");
      }}
    />
  );
}
