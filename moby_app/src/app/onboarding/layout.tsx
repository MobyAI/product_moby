export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import AuthShell from "@/components/layouts/AuthShell";

export default function OnboardingLayout({
    children
}: {
    children: ReactNode
}) {
    return (
        <AuthShell requireProfile={false}>
            <div className="bg-white min-h-screen min-w-screen p-8">
                {children}
            </div>
        </AuthShell>
    );
}