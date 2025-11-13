"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  User,
  ArrowRightToLine,
  LayoutDashboard,
  CircleQuestionMark,
} from "lucide-react";
import { handleLogout } from "@/lib/api/auth";
import { auth } from "@/lib/firebase/client/config/app";
import { useNavBarContext } from "@/components/layouts/NavBarShell";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Route = { href: string; label: string; icon: IconType };

export default function NavBar() {
  const router = useRouter();

  const EXPANDED_WIDTH = "15rem"; // 192px
  const COLLAPSED_WIDTH = "5rem"; // 64px
  const TOGGLE_BTN_OFFSET = 2.5; // rem offset from navbar edge
  const ANIMATION_DURATION = 100;
  const TYPING_SPEED = 50;
  const MOBILE_BREAKPOINT = 1024;

  const routes: Route[] = [
    { href: "/tracker", label: "Tracker", icon: LayoutDashboard },
    { href: "/scripts/list", label: "Scripts", icon: FileText },
  ];

  const pathname = usePathname();
  const profileSrc = auth.currentUser?.photoURL ?? null;
  const profileDisplayName = auth.currentUser?.displayName ?? "";
  const profileEmail = auth.currentUser?.email ?? "";
  const { isCollapsed, setIsCollapsed } = useNavBarContext();

  // State to control when to show expanded content
  const [showExpandedContent, setShowExpandedContent] = useState(!isCollapsed);
  const [logoText, setLogoText] = useState(isCollapsed ? "" : "odee");
  const [isMobileView, setIsMobileView] = useState(false);

  // Auto collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobileView(isMobile);

      if (isMobile && !isCollapsed) {
        setIsCollapsed(true);
      }
    };

    // Check on mount
    handleResize();

    // Listen to resize events
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isCollapsed, setIsCollapsed]);

  useEffect(() => {
    if (isCollapsed) {
      // Hide content immediately when collapsing
      setShowExpandedContent(false);
      setLogoText("");
    } else {
      // Start typing animation after navbar expands
      const expandTimer = setTimeout(() => {
        setShowExpandedContent(true);

        // Typewriter effect for logo
        const text = "odee";
        let currentIndex = 0;

        const typeTimer = setInterval(() => {
          if (currentIndex < text.length) {
            setLogoText(text.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(typeTimer);
          }
        }, TYPING_SPEED);

        return () => clearInterval(typeTimer);
      }, ANIMATION_DURATION);

      return () => clearTimeout(expandTimer);
    }
  }, [isCollapsed]);

  const onLogout = async () => {
    const result = await handleLogout();

    if (result.success) {
      router.push("/login");
    } else {
      console.error("❌ Logout failed:", result.error);
    }
  };

  // Calculate toggle button position based on navbar width
  const toggleBtnPosition = isCollapsed
    ? `calc(${COLLAPSED_WIDTH} - 2.5rem)`
    : `calc(${EXPANDED_WIDTH} - ${TOGGLE_BTN_OFFSET}rem)`;

  // Only allow toggle if not in mobile view
  const handleToggle = () => {
    if (!isMobileView) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <>
      {/* Main NavBar */}
      <aside
        className={[
          "fixed left-0 top-1/2 -translate-y-1/2 z-50",
          "h-[99%] bg-[#e1ddcf] border-[0.5px] border-black/10",
          "rounded-tr-[10px] rounded-br-[10px]",
          "shadow-3xl",
          "flex flex-col items-start justify-between py-4",
          "transition-all duration-300 ease-in-out",
        ].join(" ")}
        style={{
          width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        }}
        aria-label="Primary navigation"
      >
        {/* Top Section */}
        <div className="flex flex-col w-full">
          {/* Logo */}
          <div
            className={["mb-8", isCollapsed ? "px-2 text-center" : "pl-4"].join(
              " "
            )}
          >
            <div
              className={[
                "flex items-center",
                isCollapsed ? "justify-center" : "gap-2",
              ].join(" ")}
            >
              <div className="bg-black rounded-lg w-12 h-12 flex items-center justify-center">
                <Image
                  src="/icon.svg"
                  alt="Odee Logo"
                  width={45}
                  height={45}
                  className="flex-shrink-0 rounded-xl"
                  priority
                />
              </div>
              {!isCollapsed && (
                <h1 className="text-logo-lg text-black mt-1.5">
                  <span>{logoText}</span>
                  {/* Blinking cursor during typing */}
                  {logoText.length < 4 && (
                    <span className="animate-pulse">|</span>
                  )}
                </h1>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav
            className={[
              "flex flex-col gap-3 w-full",
              isCollapsed ? "px-3" : "pl-3 pr-3",
            ].join(" ")}
          >
            {routes.map(({ href, label, icon: Icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");

              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "group relative flex items-center gap-3 rounded-xl transition-all",
                    "w-full",
                    isCollapsed ? "justify-center px-2 py-3" : "px-3 py-3",
                    active ? "bg-primary-dark" : "hover:bg-black/5",
                  ].join(" ")}
                >
                  {/* Icon */}
                  <Icon
                    className={[
                      "h-6 w-6 flex-shrink-0",
                      active
                        ? "text-primary-light"
                        : "text-black/70 group-hover:text-black",
                    ].join(" ")}
                  />

                  {/* Label - only show when expanded */}
                  {!isCollapsed && (
                    <span
                      className={[
                        "font-medium text-lg transition-opacity duration-150",
                        active
                          ? "text-primary-light"
                          : "text-black/80 group-hover:text-black",
                        showExpandedContent ? "opacity-100" : "opacity-0",
                      ].join(" ")}
                    >
                      {label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section - Profile Pill */}
        <div className={[isCollapsed ? "px-2" : "px-3", "w-full"].join(" ")}>
          {/* Docs Button */}
          <button
            type="button"
            onClick={() => console.log("Go to documentation")}
            className={[
              "group relative flex items-center gap-3 rounded-xl transition-colors",
              "w-full mb-0",
              isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2",
              "hover:bg-black/5 hover:cursor-pointer",
            ].join(" ")}
            title="Log out"
            aria-label="Log out"
          >
            <CircleQuestionMark
              className={["h-5 w-5 flex-shrink-0", "text-black/60"].join(" ")}
            />
            {/* Label - only show when expanded */}
            {!isCollapsed && (
              <span
                className={[
                  "font-medium text-sm text-black/80 transition-opacity duration-150",
                  showExpandedContent ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Docs
              </span>
            )}
          </button>

          {/* Logout Button - Hidden by default as per your code */}
          <button
            type="button"
            onClick={onLogout}
            className={[
              "group relative flex items-center gap-3 rounded-xl transition-colors",
              "w-full mb-3",
              isCollapsed ? "justify-center px-2 py-2" : "px-3 py-2",
              "hover:bg-black/5 hover:cursor-pointer",
            ].join(" ")}
            title="Log out"
            aria-label="Log out"
          >
            <LogOut
              className={["h-5 w-5 flex-shrink-0", "text-black/60"].join(" ")}
            />
            {/* Label - only show when expanded */}
            {!isCollapsed && (
              <span
                className={[
                  "font-medium text-sm text-black/80 transition-opacity duration-150",
                  showExpandedContent ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                Logout
              </span>
            )}
          </button>

          <Link
            href="/profile"
            className={[
              "flex items-center",
              "bg-gradient-to-t from-[#dad3bd] to-[#e1ddcf]",
              "hover:cursor-pointer",
              "border-[0.5px] border-black/10",
              "rounded-[10px]",
              "transition-all",
              isCollapsed ? "p-2 justify-center" : "p-2 pr-4",
            ].join(" ")}
            title="Profile"
            aria-label="Profile"
          >
            {/* Avatar */}
            <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300 flex-shrink-0">
              {profileSrc ? (
                <Image
                  src={profileSrc}
                  alt="Profile"
                  priority
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

            {/* Email - only show when expanded */}
            {!isCollapsed && (
              <div
                className={[
                  "ml-3 min-w-0 transition-opacity duration-150",
                  showExpandedContent ? "opacity-100" : "opacity-0",
                ].join(" ")}
              >
                <span className="text-sm font-semibold text-black/80 truncate block">
                  {profileEmail || profileDisplayName || "User"}
                </span>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Toggle Button - Only show when screen is >= 1110px */}
      {!isMobileView && (
        <button
          onClick={handleToggle}
          className={[
            "fixed top-1/2 -translate-y-1/2 z-50",
            "h-10 w-10 rounded-full",
            "bg-transparent",
            "flex items-center justify-center",
            "transition-all duration-300 ease-in-out",
            "group",
          ].join(" ")}
          style={{
            left: toggleBtnPosition,
          }}
          aria-label={isCollapsed ? "Show navigation" : "Hide navigation"}
          title={isCollapsed ? "Show navigation" : "Hide navigation"}
        >
          <ArrowRightToLine
            className={[
              "h-5 w-5 text-primary-dark",
              "transition-transform duration-300",
              "group-hover:scale-110",
              isCollapsed ? "rotate-0" : "rotate-180",
            ].join(" ")}
          />
        </button>
      )}
    </>
  );
}
