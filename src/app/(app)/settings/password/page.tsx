import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { PasswordChangeForm } from "./password-form";

export const metadata = {
  title: "Change Password | Settings | CURA Requests",
};

export default async function PasswordPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Change Password
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Update your account password.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Password</CardTitle>
          <CardDescription>
            Enter your current password and choose a new one. Your new password
            must be at least 8 characters and include uppercase, lowercase, and a
            number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
    </div>
  );
}
