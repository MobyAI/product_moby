"use client";

import { useState, useEffect, createContext, useContext, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import NavBar from "@/components/ui/NavBar";

// Routes where navbar should auto-collapse
const AUTO_COLLAPSE_ROUTES = [
    "/scripts/upload",
    "/scripts/practice",
    "/onboarding",
    // Add more routes as needed
];

// Context for sharing collapsed state with NavBar
type NavBarContextType = {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
};

export const NavBarContext = createContext<NavBarContextType | undefined>(undefined);

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
    leftPaddingClass?: string;
};

export default function NavBarShell({
    children,
    contentClassName,
    leftPaddingClass, // We'll override this based on collapsed state
}: NavBarShellProps) {
    const pathname = usePathname();

    // Check if current route should auto-collapse
    const shouldAutoCollapse = AUTO_COLLAPSE_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    // Initialize with localStorage if available, otherwise use auto-collapse logic
    const [isCollapsed, setIsCollapsed] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('navbar-collapsed');
            if (saved !== null) return saved === 'true';
        }
        return shouldAutoCollapse;
    });

    // Auto-collapse/expand based on route (unless user manually toggled)
    useEffect(() => {
        // Only auto-adjust if user hasn't manually set a preference for this session
        const hasManualPreference = localStorage.getItem('navbar-manual-toggle-session');
        if (!hasManualPreference) {
            setIsCollapsed(shouldAutoCollapse);
        }
    }, [shouldAutoCollapse]);

    // Save preference when changed
    const handleSetCollapsed = (collapsed: boolean) => {
        setIsCollapsed(collapsed);
        localStorage.setItem('navbar-collapsed', String(collapsed));
        // Mark that user has manually toggled during this session
        sessionStorage.setItem('navbar-manual-toggle-session', 'true');
    };

    // Dynamic padding based on collapsed state
    // const dynamicLeftPadding = isCollapsed ? "pl-16" : (leftPaddingClass || "pl-24");

    // Nav bar sizing
    const NAV_BAR_CONTAINER = "w-50";
    const NAV_BAR_WIDTH = "w-45";

    return (
        <NavBarContext.Provider value={{ isCollapsed, setIsCollapsed: handleSetCollapsed }}>
            <div className="h-screen flex overflow-hidden">
                {/* Left sidebar area - transparent to show gradient */}
                <aside 
                    className={`
                        relative flex-shrink-0 transition-all duration-300 ease-in-out
                        ${isCollapsed ? 'w-15' : NAV_BAR_CONTAINER}
                    `}
                >
                    <NavBar width={NAV_BAR_WIDTH} />
                </aside>

                {/* Main content area with card-like appearance */}
                <div className="flex-1 p-4 overflow-hidden">
                    <main
                        className={`
                            h-full bg-white rounded-4xl shadow-xl
                            p-8 overflow-auto ${contentClassName ?? ""}
                        `}
                    >
                        {children}
                    </main>
                </div>
            </div>
        </NavBarContext.Provider>
    );
}