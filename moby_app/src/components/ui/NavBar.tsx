"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, LogOut, UserCircle2, ChevronRight } from "lucide-react";
import { handleLogout } from "@/lib/api/auth";
import { auth } from "@/lib/firebase/client/config/app";
import { useNavBarContext } from "@/components/layouts/NavBarShell";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Route = { href: string; label: string; icon: IconType };

type NavBarProps = {
    width?: string;
    toggleBtnX?: number;
};

export default function NavBar({ width, toggleBtnX }: NavBarProps) {
    const router = useRouter();

    const routes: Route[] = [
        // { href: "/tracker", label: "Tracker", icon: LayoutDashboard },
        { href: "/scripts/list", label: "Scripts", icon: FileText },
    ];

    const pathname = usePathname();
    const profileSrc = auth.currentUser?.photoURL ?? null;
    const profileDisplayName = auth.currentUser?.displayName ?? "";
    const profileEmail = auth.currentUser?.email ?? "";
    const { isCollapsed, setIsCollapsed } = useNavBarContext();

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
            {/* Main NavBar */}
            <aside
                className={[
                    "fixed left-4 top-1/2 -translate-y-1/2 z-50",
                    `h-[95vh] ${width} text-white`,
                    // "rounded-3xl shadow-2xl border border-white/10",
                    "flex flex-col justify-between py-4",
                    // "bg-card-alt",
                    "transition-transform duration-300 ease-in-out",
                ].join(" ")}
                style={{
                    transform: `translateX(${isCollapsed ? '-8rem' : '0'})`
                }}
                aria-label="Primary navigation"
                aria-hidden={isCollapsed}
            >
                {/* Your existing NavBar content */}
                {/* Top */}
                <div>
                    <h1 className="text-3xl font-[950] mb-[50px] ml-2">
                        <span className="text-white">play</span>
                        <span className="text-accent">r</span>
                    </h1>
                    {/* Routes (centered vertically) */}
                    <nav className="flex-1 flex flex-col items-center justify-center gap-2">
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
                                        isCollapsed ? "justify-center h-10 w-10 mx-auto" : "px-2 py-3",
                                        (!isCollapsed && active) ? "bg-btn-primary" : "hover:bg-white/10"
                                    ].join(" ")}
                                    tabIndex={isCollapsed ? -1 : 0}
                                >
                                    {/* Icon */}
                                    <Icon className={[
                                        "h-6 w-6 flex-shrink-0",
                                        active ? "text-white" : "text-white/80 group-hover:text-white"
                                    ].join(" ")} />

                                    {/* Label - only show when not collapsed */}
                                    {!isCollapsed && (
                                        <span className={[
                                            "font-medium",
                                            active ? "text-white" : "text-white/80 group-hover:text-white"
                                        ].join(" ")}>
                                            {label}
                                        </span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Logout */}
                    <button
                        type="button"
                        onClick={onLogout}
                        className={[
                            "group relative flex items-center gap-3 rounded-xl transition-colors",
                            "w-full mt-2",
                            isCollapsed ? "justify-center h-10 w-10 mx-auto" : "px-2 py-2",
                            "hover:bg-white/10"
                        ].join(" ")}
                        title="Log out"
                        aria-label="Log out"
                        tabIndex={isCollapsed ? -1 : 0}
                    >
                        <LogOut
                            className={[
                                "h-6 w-6 flex-shrink-0",
                                "text-white/80 group-hover:text-white"
                            ].join(" ")}
                        />
                        {!isCollapsed && (
                            <span
                                className={[
                                    "font-medium",
                                    "text-white/80 group-hover:text-white"
                                ].join(" ")}
                            >
                                Logout
                            </span>
                        )}
                    </button>
                </div>

                {/* Bottom */}
                <div>
                    {/* Profile */}
                    <Link
                        href="/profile"
                        className="mb-4 flex items-center gap-3 pr-2 w-full"
                        title="Profile"
                        aria-label="Profile"
                        tabIndex={isCollapsed ? -1 : 0}
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
                                <UserCircle2 className="h-11 w-11 text-white/70" />
                            )}
                        </div>

                        {/* Text info (only if not collapsed) */}
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0"> {/* 👈 min-w-0 lets flex child shrink */}
                                <span className="font-medium text-white truncate">
                                    {profileDisplayName}
                                </span>
                                <span className="text-sm text-white/70 truncate">
                                    {profileEmail}
                                </span>
                            </div>
                        )}
                    </Link>

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
                    left: isCollapsed ? "1rem" : `${toggleBtnX}rem`
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