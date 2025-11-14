"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import NavBar from "@/components/ui/NavBar";
import MobileNavBar from "@/components/ui/MobileNavBar";
import BetaAccessBanner from "../ui/BetaAccessBanner";

// Routes where navbar should auto-collapse
const AUTO_COLLAPSE_ROUTES = ["/scripts/practice"];

// Routes with dark background
const DARK_BG_ROUTES = ["/scripts/practice"];

// Context for sharing collapsed state with NavBar
type NavBarContextType = {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
};

export const NavBarContext = createContext<NavBarContextType | undefined>(
  undefined
);

export const useNavBarContext = () => {
  const context = useContext(NavBarContext);
  if (!context) {
    throw new Error("useNavBarContext must be used within NavBarShell");
  }
  return context;
};

type NavBarShellProps = {
  children: ReactNode;
  contentClassName?: string;
  betaExpiresAt?: number;
  accessLevel?: "no_access" | "beta" | "paid" | "expired";
};

export default function NavBarShell({
  children,
  contentClassName,
  betaExpiresAt,
  accessLevel,
}: NavBarShellProps) {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);

  // Check if current route should auto-collapse
  const shouldAutoCollapse = AUTO_COLLAPSE_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Check if current route should auto-collapse
  const shouldDarken = DARK_BG_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // Initialize with localStorage if available, otherwise use auto-collapse logic
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navbar-collapsed");
      if (saved !== null) return saved === "true";
    }
    return shouldAutoCollapse;
  });

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-collapse/expand based on route (unless user manually toggled)
  useEffect(() => {
    // Only auto-adjust if user hasn't manually set a preference for this session
    const hasManualPreference = localStorage.getItem(
      "navbar-manual-toggle-session"
    );
    if (!hasManualPreference) {
      setIsCollapsed(shouldAutoCollapse);
    }
  }, [shouldAutoCollapse]);

  // Save preference when changed
  const handleSetCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("navbar-collapsed", String(collapsed));
    // Mark that user has manually toggled during this session
    sessionStorage.setItem("navbar-manual-toggle-session", "true");
  };

  return (
    <NavBarContext.Provider
      value={{ isCollapsed, setIsCollapsed: handleSetCollapsed }}
    >
      <div
        className={`h-screen h-dvh flex overflow-hidden ${
          isMobile ? "flex-col" : ""
        }`}
      >
        {/* Desktop Navbar - Hidden on mobile */}
        {!isMobile && (
          <aside
            className={`
              relative flex-shrink-0 transition-all duration-300 ease-in-out
              ${isCollapsed ? "w-[5rem]" : "w-[15rem]"}
            `}
          >
            <NavBar />
          </aside>
        )}

        {/* Mobile Navbar - Only shown on mobile */}
        {isMobile && <MobileNavBar />}

        {/* Main content area with card-like appearance */}
        <div className="flex-1 h-full w-full overflow-hidden relative">
          {/* Beta Banner - positioned relative to main content */}
          <BetaAccessBanner
            betaExpiresAt={betaExpiresAt}
            accessLevel={accessLevel}
          />

          <main
            className={`
                        h-full
                        [scrollbar-width:none] [-ms-overflow-style:none]
                        ${shouldDarken ? "bg-transparent" : "bg-transparent"}
                        p-4 overflow-auto ${contentClassName ?? ""}
                      `}
          >
            {children}
          </main>
        </div>
      </div>
    </NavBarContext.Provider>
  );
}
