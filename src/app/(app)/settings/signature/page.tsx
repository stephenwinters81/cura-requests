import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { SignatureUploadForm } from "./upload-form";

export const metadata = {
  title: "Signature | Settings | CURA Requests",
};

export default async function SignaturePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { signatureImage: true },
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Signature
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your signature appears on all imaging request PDFs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Signature Image</CardTitle>
          <CardDescription>
            Upload a PNG, JPEG, or WebP image of your signature. This will be
            used on all requests regardless of which provider number you select.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignatureUploadForm
            currentSignature={user?.signatureImage ?? null}
          />
        </CardContent>
      </Card>
    </div>
  );
}
