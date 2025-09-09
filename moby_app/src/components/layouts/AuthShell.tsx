import type { ReactNode } from "react";
import ServerAuthProvider from "@/components/providers/ServerAuthProvider";
import ClientAuthProvider from "@/components/providers/ClientAuthProvider";

export default async function AuthShell({
    children,
    requireProfile = true,
}: {
    children: ReactNode;
    requireProfile?: boolean;
}) {
    return (
        <ServerAuthProvider requireProfile={requireProfile}>
            <ClientAuthProvider>{children}</ClientAuthProvider>
        </ServerAuthProvider>
    );
}