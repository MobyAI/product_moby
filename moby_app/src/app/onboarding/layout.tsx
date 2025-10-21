import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  verifyUserInfo,
  hasProfile,
} from "@/lib/firebase/admin/auth/verifySession";
import AuthShell from "@/components/layouts/AuthShell";

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userStatus = await verifyUserInfo();

  if (hasProfile(userStatus)) {
    redirect("/tracker");
  }

  return (
    <AuthShell requireProfile={false} requireAccess={false}>
      <div className="min-h-screen flex items-center justify-center bg-primary-light-alt p-4">
        {children}
      </div>
    </AuthShell>
  );
}
