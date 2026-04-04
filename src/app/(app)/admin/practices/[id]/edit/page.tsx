import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updatePractice, deletePractice } from "../../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DeletePracticeButton } from "./delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditPracticePage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const practice = await prisma.radiologyPractice.findUnique({
    where: { id },
    include: { _count: { select: { requests: true } } },
  });

  if (!practice) notFound();

  const updateWithId = updatePractice.bind(null, practice.id);
  const deleteWithId = deletePractice.bind(null, practice.id);

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
        <span className="text-foreground">{practice.name}</span>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Practice</CardTitle>
          <CardDescription>
            {practice._count.requests} request{practice._count.requests !== 1 ? "s" : ""} sent to this practice
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateWithId as unknown as (formData: FormData) => void} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Practice Name *</Label>
              <Input id="name" name="name" required defaultValue={practice.name} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" defaultValue={practice.address ?? ""} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" defaultValue={practice.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fax">Fax Number</Label>
                <Input id="fax" name="fax" type="tel" defaultValue={practice.fax ?? ""} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" name="email" type="email" defaultValue={practice.email ?? ""} />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/practices">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Deleting a practice is permanent and cannot be undone.
            {practice._count.requests > 0 && " Practices with existing requests cannot be deleted."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeletePracticeButton
            practiceId={practice.id}
            practiceName={practice.name}
            hasRequests={practice._count.requests > 0}
            deleteAction={deleteWithId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
