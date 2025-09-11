import { redirect } from "next/navigation";
import { ReactNode } from "react";
import { verifyUserInfo, isAuthenticated } from "@/lib/firebase/admin/auth/verifySession";

// Define your admin UIDs
// const ADMIN_UIDS = [
//   "your-admin-uid-here",
// ];

const ADMIN_UIDS = process.env.NEXT_PUBLIC_ADMIN_UIDS?.split(',') || [];

interface AdminAuthWrapperProps {
  children: ReactNode;
  fallbackPath?: string;
}

export default async function AdminAuthShell({ 
  children, 
  fallbackPath = "/home" 
}: AdminAuthWrapperProps) {
  const userStatus = await verifyUserInfo();

  // Check if user is authenticated
  if (!isAuthenticated(userStatus)) {
    redirect("/login");
  }

  // Check if user is an admin
  if (!ADMIN_UIDS.includes(userStatus.uid)) {
    redirect(fallbackPath);
  }

  // User is authenticated and is an admin
  return <>{children}</>;
}