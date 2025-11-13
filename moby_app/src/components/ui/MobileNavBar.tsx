// components/ui/MobileNavBar.tsx
"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  User,
  Menu,
  X,
  LayoutDashboard,
  CircleQuestionMark,
} from "lucide-react";
import { handleLogout } from "@/lib/api/auth";
import { auth } from "@/lib/firebase/client/config/app";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;
type Route = { href: string; label: string; icon: IconType };

export default function MobileNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const routes: Route[] = [
    { href: "/tracker", label: "Tracker", icon: LayoutDashboard },
    { href: "/scripts/list", label: "Scripts", icon: FileText },
  ];

  const profileSrc = auth.currentUser?.photoURL ?? null;
  const profileDisplayName = auth.currentUser?.displayName ?? "";
  const profileEmail = auth.currentUser?.email ?? "";

  const onLogout = async () => {
    const result = await handleLogout();
    if (result.success) {
      router.push("/login");
    } else {
      console.error("❌ Logout failed:", result.error);
    }
  };

  return (
    <>
      {/* Top Bar with Menu Button */}
      <div className="fixed top-0 left-0 right-0 z-[50] w-[25%] bg-transparent px-4 py-3 flex items-start justify-start">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-black/5"
          aria-label="Toggle menu"
        >
          <Menu className="w-8 h-8 text-primary-dark" />
        </button>
        
      </div>

      {/* Slide-out Menu */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setIsOpen(false)}
          className="absolute inset-0 bg-black/50"
        />

        {/* Menu Panel */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-[280px] bg-[#e1ddcf] shadow-xl transform transition-transform duration-300 ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <h1 className="text-logo text-primary-dark">odee</h1>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-black/5"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-primary-dark" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1 p-4">
            {routes.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? "bg-primary-dark-alt text-primary-light"
                      : "hover:bg-black/5 text-black/80"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium text-base">{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Docs Button */}
            <button
              onClick={() => console.log("Go to documentation")}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 w-full mb-2"
            >
              <CircleQuestionMark className="h-5 w-5 text-black/60" />
              <span className="font-medium text-sm text-black/80">Docs</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-black/5 w-full mb-3"
            >
              <LogOut className="h-5 w-5 text-black/60" />
              <span className="font-medium text-sm text-black/80">Logout</span>
            </button>

            {/* Profile Card */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 bg-gradient-to-t from-[#dad3bd] to-[#e1ddcf] border border-black/10 rounded-lg p-3"
            >
              <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300 flex-shrink-0">
                {profileSrc ? (
                  <Image
                    src={profileSrc}
                    alt="Profile"
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-600" />
                  </div>
                )}
              </div>
              <span className="text-sm font-semibold text-black/80 truncate">
                {profileEmail || profileDisplayName || "User"}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
