import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/trusted-device";
import { MfaForm } from "./mfa-form";

export default async function MfaPage() {
  const session = await auth();

  // If already fully verified, go to dashboard
  if (session?.user?.mfaVerified) {
    redirect("/requests/new");
  }

  // If no session at all, go to login
  if (!session?.user?.email) {
    redirect("/login");
  }

  // Check for trusted device cookie — auto-skip MFA if valid
  const cookieStore = await cookies();
  const trustToken = cookieStore.get(COOKIE_NAME)?.value;

  if (trustToken) {
    try {
      await signIn("credentials", {
        email: session.user.email,
        deviceTrustToken: trustToken,
        redirect: false,
      });
      // If signIn succeeds without throwing, redirect
      redirect("/requests/new");
    } catch (error: unknown) {
      // Auth.js v5 throws NEXT_REDIRECT on success
      if (
        error &&
        typeof error === "object" &&
        "digest" in error &&
        typeof (error as { digest: unknown }).digest === "string" &&
        (error as { digest: string }).digest.includes("NEXT_REDIRECT")
      ) {
        throw error; // Re-throw the redirect
      }
      // Trust token invalid/expired — clear the stale cookie and show MFA form
      cookieStore.delete(COOKIE_NAME);
    }
  }

  return <MfaForm />;
}
