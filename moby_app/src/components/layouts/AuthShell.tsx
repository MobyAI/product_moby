import type { ReactNode } from "react";
import ServerAuthProvider from "@/components/providers/ServerAuthProvider";
import ClientAuthProvider from "@/components/providers/ClientAuthProvider";

export default async function AuthShell({
  children,
  requireProfile = true,
  requireAccess = true,
  requireVerification = false,
}: {
  children: ReactNode;
  requireProfile?: boolean;
  requireAccess?: boolean;
  requireVerification?: boolean;
}) {
  return (
    <ServerAuthProvider
      requireProfile={requireProfile}
      requireAccess={requireAccess}
      requireVerification={requireVerification}
    >
      <ClientAuthProvider>{children}</ClientAuthProvider>
    </ServerAuthProvider>
  );
}
