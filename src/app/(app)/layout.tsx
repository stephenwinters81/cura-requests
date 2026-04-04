import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SessionProvider } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.mfaVerified) {
    redirect("/login?step=mfa");
  }

  return (
    <SessionProvider session={session}>
      <AppShell userRole={session.user.role}>
        {children}
      </AppShell>
    </SessionProvider>
  );
}
