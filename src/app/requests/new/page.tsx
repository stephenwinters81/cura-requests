import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ImagingRequestForm } from "./form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "New Imaging Request | CURA Requests",
};

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const isAdmin = session.user.role === "admin";

  const [practices, radiologists, user] = await Promise.all([
    prisma.radiologyPractice.findMany({
      orderBy: { usageCount: "desc" },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        fax: true,
        email: true,
        usageCount: true,
      },
    }),
    prisma.radiologist.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        practices: { select: { id: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        defaultProviderId: true,
        providers: {
          orderBy: [{ doctorName: "asc" }, { location: "asc" }],
          select: {
            id: true,
            doctorName: true,
            providerNumber: true,
            location: true,
          },
        },
      },
    }),
  ]);

  // Admins see all providers; staff see only their linked providers
  const providers = isAdmin
    ? await prisma.provider.findMany({
        orderBy: [{ doctorName: "asc" }, { location: "asc" }],
        select: {
          id: true,
          doctorName: true,
          providerNumber: true,
          location: true,
        },
      })
    : user?.providers ?? [];

  // Block if user has no providers configured
  if (providers.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            New Imaging Request
          </h1>
        </div>
        <Card>
          <CardContent className="px-6 py-16 text-center">
            <p className="text-sm font-medium text-foreground">
              No provider numbers configured
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              You need to add at least one provider number before you can create imaging requests.
            </p>
            <Button asChild className="mt-4">
              <Link href="/settings/providers/new">Add Provider Number</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          New Imaging Request
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a radiology imaging request for delivery via email or fax.
        </p>
      </div>

      <ImagingRequestForm
        practices={practices}
        providers={providers}
        radiologists={radiologists}
        defaultProviderId={user?.defaultProviderId ?? undefined}
        userName={session.user.name}
      />
    </div>
  );
}
