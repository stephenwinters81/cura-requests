import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateProvider, deleteProvider } from "../../actions";
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
import { DeleteProviderButton } from "./delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProviderPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  // Only load if the provider belongs to this user
  const provider = await prisma.provider.findFirst({
    where: {
      id,
      users: { some: { id: session.user.id } },
    },
    include: { _count: { select: { requests: true } } },
  });

  if (!provider) notFound();

  const updateWithId = updateProvider.bind(null, provider.id);
  const deleteWithId = deleteProvider.bind(null, provider.id);

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
        <span className="text-foreground">
          {provider.location} ({provider.providerNumber})
        </span>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Provider Number</CardTitle>
          <CardDescription>
            {provider._count.requests} request
            {provider._count.requests !== 1 ? "s" : ""} created with this
            provider number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={
              updateWithId as unknown as (formData: FormData) => void
            }
            className="space-y-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="providerNumber">Provider Number *</Label>
                <Input
                  id="providerNumber"
                  name="providerNumber"
                  required
                  defaultValue={provider.providerNumber}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Clinic Name *</Label>
                <Input
                  id="location"
                  name="location"
                  required
                  defaultValue={provider.location}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Clinic Address</Label>
              <Input
                id="address"
                name="address"
                defaultValue={provider.address ?? ""}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={provider.phone ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax</Label>
                <Input
                  id="fax"
                  name="fax"
                  type="tel"
                  defaultValue={provider.fax ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={provider.email ?? ""}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
              <Button variant="ghost" asChild>
                <Link href="/settings/providers">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Removing a provider number is permanent.
            {provider._count.requests > 0 &&
              " Provider numbers with existing requests cannot be removed."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteProviderButton
            providerNumber={provider.providerNumber}
            location={provider.location}
            hasRequests={provider._count.requests > 0}
            deleteAction={deleteWithId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
