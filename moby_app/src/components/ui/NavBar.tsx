"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    // LayoutDashboard,
    FileText,
    LogOut,
    User,
    ChevronRight
} from "lucide-react";
import { handleLogout } from "@/lib/api/auth";
import { auth } from "@/lib/firebase/client/config/app";
import { useNavBarContext } from "@/components/layouts/NavBarShell";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Route = { href: string; label: string; icon: IconType };

export default function NavBar() {
    const router = useRouter();

    const EXPANDED_WIDTH = "12rem"; // 192px
    const COLLAPSED_WIDTH = "4rem"; // 64px
    const TOGGLE_BTN_OFFSET = 2; // rem offset from navbar edge
    const ANIMATION_DURATION = 100;
    const TYPING_SPEED = 50;

    const routes: Route[] = [
        // { href: "/tracker", label: "Tracker", icon: LayoutDashboard },
        { href: "/scripts/list", label: "Scripts", icon: FileText },
    ];

    const pathname = usePathname();
    const profileSrc = auth.currentUser?.photoURL ?? null;
    const profileDisplayName = auth.currentUser?.displayName ?? "";
    const profileEmail = auth.currentUser?.email ?? "";
    const { isCollapsed, setIsCollapsed } = useNavBarContext();

    // State to control when to show expanded content
    const [showExpandedContent, setShowExpandedContent] = useState(!isCollapsed);
    const [logoText, setLogoText] = useState(isCollapsed ? "" : "playr");

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
                const text = "playr";
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
        ? `calc(1rem + ${COLLAPSED_WIDTH} - ${TOGGLE_BTN_OFFSET}rem)`
        : `calc(1rem + ${EXPANDED_WIDTH} - ${TOGGLE_BTN_OFFSET}rem)`;

    return (
        <>
            {/* Main NavBar */}
            <aside
                className={[
                    "fixed left-4 top-1/2 -translate-y-1/2 z-50",
                    `h-[95vh] text-white`,
                    "flex flex-col justify-between py-4",
                    "transition-all duration-300 ease-in-out",
                ].join(" ")}
                style={{
                    width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
                }}
                aria-label="Primary navigation"
            >
                {/* Top */}
                <div>
                    {/* Logo with typewriter effect */}
                    {!isCollapsed ? (
                        <h1 className="text-4xl pb-[25px] ml-2 font-poppins font-bold">
                            <span className="text-white">
                                {logoText.slice(0, 4)}
                            </span>
                            <span className="text-accent">
                                {logoText.slice(4)}
                            </span>
                            {/* Blinking cursor during typing */}
                            {logoText.length < 5 && (
                                <span className="animate-pulse">|</span>
                            )}
                        </h1>
                    ) : (
                        <h1 className="text-4xl text-center border-b border-white/40 pb-[25px]">
                            <span className="font-poppins font-bold text-white">p.</span>
                        </h1>
                    )}

                    {/* Routes */}
                    <nav className="flex-1 flex flex-col items-center justify-center gap-2 pt-[15px]">
                        {routes.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href || pathname.startsWith(href + "/");

                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    title={label}
                                    aria-label={label}
                                    aria-current={active ? "page" : undefined}
                                    className={[
                                        "group relative flex items-center gap-3 rounded-xl transition-colors",
                                        "w-full",
                                        isCollapsed ? "justify-center px-2 py-3" : "px-2 py-3",
                                        active ? "bg-btn-primary" : "hover:bg-white/10"
                                    ].join(" ")}
                                >
                                    {/* Icon */}
                                    <Icon className={[
                                        "h-6 w-6 flex-shrink-0",
                                        active ? "text-white" : "text-white/80 group-hover:text-white"
                                    ].join(" ")} />

                                    {/* Label - only show when expanded */}
                                    {!isCollapsed && (
                                        <span className={[
                                            "font-medium text-lg transition-opacity duration-150",
                                            active ? "text-white" : "text-white",
                                            showExpandedContent ? "opacity-100" : "opacity-0"
                                        ].join(" ")}>
                                            {label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom */}
                <div>
                    {/* Profile */}
                    <div className="border-t border-white/40 py-3">
                        <Link
                            href="/profile"
                            className={[
                                "flex items-center gap-3 w-full",
                                isCollapsed ? "justify-center my-3" : "my-6 pr-2"
                            ].join(" ")}
                            title="Profile"
                            aria-label="Profile"
                        >
                            {/* Avatar */}
                            <div className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/20 flex-shrink-0">
                                {profileSrc ? (
                                    <Image
                                        src={profileSrc}
                                        alt="Profile"
                                        priority
                                        width={44}
                                        height={44}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-11 w-11 text-white/70" />
                                )}
                            </div>

                            {/* Text info - only show when expanded */}
                            {!isCollapsed && (
                                <div className={[
                                    "flex flex-col min-w-0 transition-opacity duration-150",
                                    showExpandedContent ? "opacity-100" : "opacity-0"
                                ].join(" ")}>
                                    <span className="font-medium text-white truncate">
                                        {profileDisplayName}
                                    </span>
                                    <span className="text-sm text-white/70 truncate">
                                        {profileEmail}
                                    </span>
                                </div>
                            )}
                        </Link>

                        {/* Logout */}
                        <button
                            type="button"
                            onClick={onLogout}
                            className={[
                                "group relative flex items-center gap-3 rounded-xl transition-colors",
                                "w-full",
                                isCollapsed ? "justify-center px-2 py-2" : "px-2 py-2",
                                "hover:bg-red-400"
                            ].join(" ")}
                            title="Log out"
                            aria-label="Log out"
                        >
                            <LogOut
                                className={[
                                    "h-6 w-6 flex-shrink-0",
                                    "text-white/80 group-hover:text-white"
                                ].join(" ")}
                            />
                            {/* Label - only show when expanded */}
                            {!isCollapsed && (
                                <span className={[
                                    "font-medium text-md text-white transition-opacity duration-150",
                                    showExpandedContent ? "opacity-100" : "opacity-0"
                                ].join(" ")}>
                                    Logout
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Toggle Button - Always Visible */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={[
                    "fixed top-1/2 -translate-y-1/2 z-50",
                    "h-10 w-10 rounded-full",
                    "bg-btn-primary",
                    "border border-white/10 shadow-lg",
                    "flex items-center justify-center",
                    "transition-all duration-300 ease-in-out",
                    "group"
                ].join(" ")}
                style={{
                    left: toggleBtnPosition
                }}
                aria-label={isCollapsed ? "Show navigation" : "Hide navigation"}
                title={isCollapsed ? "Show navigation" : "Hide navigation"}
            >
                <ChevronRight
                    className={[
                        "h-5 w-5 text-white",
                        "transition-transform duration-300",
                        "group-hover:scale-110",
                        isCollapsed ? "rotate-0" : "rotate-180"
                    ].join(" ")}
                />
            </button>
        </>
    );
}