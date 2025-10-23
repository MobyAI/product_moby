import { redirect } from "next/navigation";
import { ReactNode } from "react";
import {
  verifyUserInfo,
  isAuthenticated,
} from "@/lib/firebase/admin/auth/verifySession";

interface AdminAuthWrapperProps {
  children: ReactNode;
  fallbackPath?: string;
}

export default async function AdminAuthShell({
  children,
  fallbackPath = "/home",
}: AdminAuthWrapperProps) {
  const userStatus = await verifyUserInfo();

  // Check if user is authenticated
  if (!isAuthenticated(userStatus)) {
    redirect("/login");
  }

  // Check if user has admin custom claim
  const isAdmin = userStatus.admin === true;

  if (!isAdmin) {
    redirect(fallbackPath);
  }

  // User is authenticated and is an admin
  return <>{children}</>;
}
