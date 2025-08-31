"use client";

import { useAuthState } from "@/components/providers/UserProvider";

export default function ClientAuthProvider({ children }: { children: React.ReactNode }) {
    const { clientReady } = useAuthState();

    if (!clientReady) {
        // Block render until Firebase client SDK has initialized.
        // You can return a full-screen loader if you want:
        // return <div className="grid min-h-dvh place-items-center">Initializing…</div>;
        return null;
    }

    return <>{children}</>;
}