"use client";

import { handleLogout } from "@/lib/api/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ className }: { className?: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const onLogout = async () => {
        setLoading(true);
        const result = await handleLogout();
        setLoading(false);

        if (result.success) {
            router.push("/login");
        } else {
            console.error("❌ Logout failed:", result.error);
        }
    };

    return (
        <button
            onClick={onLogout}
            disabled={loading}
            className={`px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ${className}`}
        >
            {loading ? "Logging out..." : "Logout"}
        </button>
    );
}