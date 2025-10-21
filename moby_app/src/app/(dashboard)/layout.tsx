export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import AuthShell from "@/components/layouts/AuthShell";
import NavBarShell from "@/components/layouts/NavBarShell";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AccessGateModal } from "@/components/ui/AccessGateModal";
import BetaAccessBanner from "@/components/ui/BetaAccessBanner";
import {
  verifyUserInfo,
  isAuthenticated,
} from "@/lib/firebase/admin/auth/verifySession";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userStatus = await verifyUserInfo();

  const betaExpiresAt = isAuthenticated(userStatus)
    ? userStatus.betaExpiresAt
    : undefined;

  const accessLevel = isAuthenticated(userStatus)
    ? userStatus.accessLevel
    : undefined;

  return (
    <AuthShell>
      <AccessGateModal />
      <NavBarShell betaExpiresAt={betaExpiresAt} accessLevel={accessLevel}>
        <ToastProvider>{children}</ToastProvider>
      </NavBarShell>
    </AuthShell>
  );
}
