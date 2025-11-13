export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { verifySession } from "@/lib/firebase/admin/auth/verifySession";

export default async function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await verifySession();
  if (user) redirect("/tracker");

  return (
    <div className="h-screen h-dvh flex flex-col bg-[#EEEDE4]">
      {/* Logo */}
      <div className="pl-5 pt-4">
        <h1 className="text-logo text-primary-dark">odee</h1>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 mb-20">
        <Suspense
          fallback={
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 border-4 border-gray-300 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-gray-700 rounded-full animate-spin"></div>
              </div>
              <p className="text-gray-700 text-lg font-medium">Loading...</p>
            </div>
          }
        >
          {children}
        </Suspense>
      </div>
    </div>
  );
}
