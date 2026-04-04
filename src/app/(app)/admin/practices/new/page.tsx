import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { createPractice } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function NewPracticePage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

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
            At least an email address or fax number is required for delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPractice as unknown as (formData: FormData) => void} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Practice Name *</Label>
              <Input id="name" name="name" required placeholder="e.g. Sydney Radiology Group" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" placeholder="Street address" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" placeholder="(02) 9XXX XXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax Number</Label>
                <Input id="fax" name="fax" type="tel" placeholder="(02) 9XXX XXXX" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" placeholder="referrals@practice.com.au" />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Create Practice</Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/practices">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
