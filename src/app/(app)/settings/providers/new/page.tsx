import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { createProvider } from "../actions";
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

export const metadata = {
  title: "Add Provider Number | Settings | CURA Requests",
};

export default async function NewProviderPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings/providers"
          className="hover:text-foreground transition-colors"
        >
          Provider Numbers
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
        <span className="text-foreground">Add Provider Number</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Provider Number</CardTitle>
          <CardDescription>
            Enter your provider number and the clinic details where you practice
            under this number. The clinic details will appear on imaging request
            forms.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={createProvider as unknown as (formData: FormData) => void}
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="providerNumber">Provider Number *</Label>
                <Input
                  id="providerNumber"
                  name="providerNumber"
                  required
                  placeholder="e.g. 4111709B"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Clinic Name *</Label>
                <Input
                  id="location"
                  name="location"
                  required
                  placeholder="e.g. CURA Medical Specialists"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Clinic Address</Label>
              <Input
                id="address"
                name="address"
                placeholder="Street address"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(02) 9XXX XXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input
                  id="fax"
                  name="fax"
                  type="tel"
                  placeholder="(02) 9XXX XXXX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="admin@clinic.com.au"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Add Provider Number</Button>
              <Button variant="ghost" asChild>
                <Link href="/settings/providers">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
