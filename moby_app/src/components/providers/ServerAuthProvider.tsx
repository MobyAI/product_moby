import { redirect } from "next/navigation";
import {
  verifyUserInfo,
  isAuthenticated,
  hasProfile,
  hasAccess,
  isEmailVerified,
} from "@/lib/firebase/admin/auth/verifySession";
import { UserProvider, type AuthUser } from "./UserProvider";

export default async function ServerAuthProvider({
  children,
  requireProfile = true,
  requireAccess = true,
  requireVerification = false,
}: {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireAccess?: boolean;
  requireVerification?: boolean;
}) {
  const userStatus = await verifyUserInfo();

  // 1. Check authentication first
  if (!isAuthenticated(userStatus)) {
    redirect("/login");
  }

  // 2. Check email verification
  if (requireVerification && !isEmailVerified(userStatus)) {
    redirect("/verify-email");
  }

  // 3. Check access level (before profile check)
  // Users need access code before they can proceed
  if (requireAccess && !hasAccess(userStatus)) {
    redirect("/access-code");
  }

  // 4. Check profile completion
  if (requireProfile && !hasProfile(userStatus)) {
    redirect("/onboarding");
  }

  // 5. Prevent accessing onboarding if profile already exists
  // if (!requireProfile && hasProfile(userStatus)) {
  //   redirect("/tracker");
  // }

  const value: AuthUser = {
    uid: userStatus.uid,
    email: userStatus.email,
  };

  return <UserProvider value={value}>{children}</UserProvider>;
}
