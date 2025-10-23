import { redirect } from "next/navigation";
import {
  verifyUserInfo,
  isAuthenticated,
  hasProfile,
  hasAccess,
} from "@/lib/firebase/admin/auth/verifySession";
import { UserProvider, type AuthUser } from "./UserProvider";

export default async function ServerAuthProvider({
  children,
  requireProfile = true,
  requireAccess = true,
}: {
  children: React.ReactNode;
  requireProfile?: boolean;
  requireAccess?: boolean;
}) {
  const userStatus = await verifyUserInfo();

  // 1. Check authentication first
  if (!isAuthenticated(userStatus)) {
    redirect("/login");
  }

  // 2. Check access level (before profile check)
  // Users need beta code before they can proceed
  if (requireAccess && !hasAccess(userStatus)) {
    redirect("/beta-code");
  }

  // 3. Check profile completion
  if (requireProfile && !hasProfile(userStatus)) {
    redirect("/onboarding");
  }

  // 4. Prevent accessing onboarding if profile already exists
  // if (!requireProfile && hasProfile(userStatus)) {
  //   redirect("/tracker");
  // }

  const value: AuthUser = {
    uid: userStatus.uid,
  };

  return <UserProvider value={value}>{children}</UserProvider>;
}
