export const dynamic = 'force-dynamic';

import type { ReactNode } from "react";
import AuthShell from "@/components/layouts/AuthShell";

export default function BetaCodeLayout({ children }: { children: ReactNode }) {
  return (
    <AuthShell requireProfile={false} requireAccess={false}>
      <div className="min-h-screen w-screen flex items-center justify-center bg-primary-light-alt p-4">
        {children}
      </div>
    </AuthShell>
  );
}
