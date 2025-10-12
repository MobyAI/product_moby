import React, { ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { HelpCircle, LogOut, User } from "lucide-react";
import { handleLogout } from "@/lib/api/auth";
import { auth } from "@/lib/firebase/client/config/app";

interface LayoutProps {
  children: ReactNode;
  maxWidth?: number;
}

export function DashboardLayout({ children, maxWidth }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const profilePhoto = auth.currentUser?.photoURL ?? null;

  const onLogout = async () => {
    const result = await handleLogout();

    if (result.success) {
      router.push("/login");
    } else {
      console.error("❌ Logout failed:", result.error);
    }
  };

  return (
    <div className="h-screen w-full bg-white p-5 overflow-hidden">
      <div className="h-full rounded-[20px] bg-gradient-to-b from-[#DDE7EB] to-[#F5F7FB] flex flex-col overflow-hidden">
        {/* Header */}
        <header className="relative px-8 pt-6 pb-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="text-logo text-primary-dark">tableread</div>

            {/* Center Navigation */}
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2">
              <div className="relative flex items-center justify-center gap-3 px-8 pb-2">
                {/* Inverted trapezoid background */}
                <svg
                  className="absolute inset-0 w-full h-full"
                  viewBox="0 0 400 60"
                  preserveAspectRatio="none"
                >
                  <path d="M 0 0 L 400 0 L 360 60 L 40 60 Z" fill="white" />
                </svg>

                {/* Navigation links */}
                {[
                  { key: "tracker", label: "Auditions" },
                  { key: "scripts/list", label: "Scripts" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => router.push(`/${tab.key}`)}
                    className={`relative z-10 px-20 pb-3 pt-1.5 text-lg font-semibold transition-colors duration-200 ${
                      pathname.startsWith(`/${tab.key}`)
                        ? "text-primary-dark"
                        : "text-primary-dark"
                    }`}
                  >
                    {tab.label}
                    {pathname.startsWith(`/${tab.key}`) && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-[2px] bg-gray-900 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Icons */}
            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-full bg-primary-light hover:bg-gray-200 shadow-sm hover:shadow-md transition-colors flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-primary-dark" />
              </button>
              <button
                onClick={onLogout}
                className="w-10 h-10 rounded-full bg-primary-light hover:bg-gray-200 shadow-sm hover:shadow-md transition-colors flex items-center justify-center"
              >
                <LogOut className="w-5 h-5 text-primary-dark" />
              </button>
              <button
                onClick={() => router.push("/profile")}
                className="w-10 h-10 rounded-full bg-primary-light hover:bg-gray-200 shadow-sm hover:shadow-md transition-colors flex items-center justify-center"
              >
                {profilePhoto ? (
                  <Image
                    src={profilePhoto}
                    alt="Profile"
                    priority
                    width={25}
                    height={25}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5 text-primary-dark" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div
          className="flex-1 overflow-auto px-8 pb-8"
          style={
            maxWidth
              ? { maxWidth: `${maxWidth}%`, margin: "0 auto", width: "100%" }
              : undefined
          }
        >
          {children}
        </div>
      </div>
    </div>
  );
}
