export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import AuthShell from "@/components/layouts/AuthShell";
import NavBarShell from "@/components/layouts/NavBarShell";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { AccessGateModal } from "@/components/ui/AccessGateModal";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell>
      <AccessGateModal />
      <NavBarShell>
        <ToastProvider>{children}</ToastProvider>
      </NavBarShell>
    </AuthShell>
  );
}
