import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AddPracticeInline } from "./add-practice-inline";

export default async function NewPracticePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/requests/new");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin/practices" className="hover:text-foreground transition-colors">
          Practices
        </Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span className="text-foreground">New Practice</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Radiology Practice</CardTitle>
          <CardDescription>
            Enter details manually or search online to find the practice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddPracticeInline />
        </CardContent>
      </Card>
    </div>
  );
}
