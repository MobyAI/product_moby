export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/admin/auth/verifySession";

export default async function AuthLayout({ children }: { children: ReactNode }) {
    const user = await verifySession();
    if (user) redirect("/home");

    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm bg-white">
                <Suspense fallback={null /* show fallback */}>
                    {children}
                </Suspense>
            </div>
        </div>
    );
}