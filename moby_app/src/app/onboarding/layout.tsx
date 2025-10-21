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
            <div className="bg-transparent h-screen w-screen">
                {children}
            </div>
        </AuthShell>
    );
}