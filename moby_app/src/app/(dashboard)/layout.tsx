export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import AuthShell from "@/components/layouts/AuthShell";
import NavBarShell from "@/components/layouts/NavBarShell";

export default function DashboardLayout({
    children
}: {
    children: ReactNode
}) {
    return (
        <AuthShell>
            <NavBarShell>
                {children}
            </NavBarShell>
        </AuthShell>
    );
}