import type { ReactNode } from "react";
import ServerAuthProvider from "@/components/providers/ServerAuthProvider";
import ClientAuthProvider from "@/components/providers/ClientAuthProvider";

export default async function AuthShell({
  children,
  requireProfile = true,
  requireAccess = true,
}: {
  children: ReactNode;
  requireProfile?: boolean;
  requireAccess?: boolean;
}) {
  return (
    <ServerAuthProvider
      requireProfile={requireProfile}
      requireAccess={requireAccess}
    >
      <ClientAuthProvider>{children}</ClientAuthProvider>
    </ServerAuthProvider>
  );
}
