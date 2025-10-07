export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import AuthShell from "@/components/layouts/AuthShell";
import { ToastProvider } from "@/components/providers/ToastProvider";

export default function DashboardLayout({
    children
}: {
    children: ReactNode
}) {
    return (
        <AuthShell>
            <ToastProvider>
                {children}
            </ToastProvider>
        </AuthShell>
    );
}