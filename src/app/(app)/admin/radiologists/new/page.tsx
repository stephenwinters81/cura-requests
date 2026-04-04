import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createRadiologist } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PracticeCheckboxList } from "../practice-checkboxes";

export const metadata = {
  title: "Add Radiologist | Admin | CURA Requests",
};

export default async function NewRadiologistPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const practices = await prisma.radiologyPractice.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/admin/radiologists"
          className="hover:text-foreground transition-colors"
        >
          Radiologists
        </Link>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-foreground">Add Radiologist</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Radiologist</CardTitle>
          <CardDescription>
            Add a radiologist and select the practices where they report.
            Doctors will be able to request this radiologist when sending to
            those practices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={
              createRadiologist as unknown as (formData: FormData) => void
            }
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Radiologist Name *</Label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Dr Kartik Bhatia"
              />
            </div>

            <div className="space-y-2">
              <Label>Practices *</Label>
              <p className="text-xs text-muted-foreground">
                Select the practices where this radiologist reports.
              </p>
              <PracticeCheckboxList practices={practices} selected={[]} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Add Radiologist</Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/radiologists">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
