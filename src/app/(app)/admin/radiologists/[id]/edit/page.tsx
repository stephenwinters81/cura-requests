import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateRadiologist, deleteRadiologist } from "../../actions";
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
import { PracticeCheckboxList } from "../../practice-checkboxes";
import { DeleteRadiologistButton } from "./delete-button";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRadiologistPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/dashboard");

  const { id } = await params;

  const [radiologist, practices] = await Promise.all([
    prisma.radiologist.findUnique({
      where: { id },
      include: {
        practices: { select: { id: true } },
        _count: { select: { requests: true } },
      },
    }),
    prisma.radiologyPractice.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!radiologist) notFound();

  const selectedPracticeIds = radiologist.practices.map((p) => p.id);
  const updateWithId = updateRadiologist.bind(null, radiologist.id);
  const deleteWithId = deleteRadiologist.bind(null, radiologist.id);

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
        <span className="text-foreground">{radiologist.name}</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Edit Radiologist</CardTitle>
          <CardDescription>
            {radiologist._count.requests} request
            {radiologist._count.requests !== 1 ? "s" : ""} have requested this
            radiologist
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={
              updateWithId as unknown as (formData: FormData) => void
            }
            className="space-y-5"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Radiologist Name *</Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={radiologist.name}
              />
            </div>

            <div className="space-y-2">
              <Label>Practices *</Label>
              <p className="text-xs text-muted-foreground">
                Select the practices where this radiologist reports.
              </p>
              <PracticeCheckboxList
                practices={practices}
                selected={selectedPracticeIds}
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit">Save Changes</Button>
              <Button variant="ghost" asChild>
                <Link href="/admin/radiologists">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
          <CardDescription>
            Deleting a radiologist is permanent.
            {radiologist._count.requests > 0 &&
              " Radiologists with existing requests cannot be deleted."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteRadiologistButton
            name={radiologist.name}
            hasRequests={radiologist._count.requests > 0}
            deleteAction={deleteWithId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
