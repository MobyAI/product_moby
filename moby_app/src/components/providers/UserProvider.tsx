"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/config/client";

export type AuthUser = {
    uid: string;
    email: string | null;
    emailVerified: boolean;
};

const UserContext = createContext<AuthUser | null>(null);

export function UserProvider({
    value,
    children,
}: {
    value: AuthUser | null; // non-null in protected trees (passed by ServerAuthProvider)
    children: React.ReactNode;
}) {
    const router = useRouter();
    const initiallyAuthed = !!value; // true for protected routes
    const [user, setUser] = useState<AuthUser | null>(value ?? null);

    // Keep context in sync with client-side Firebase Auth
    useEffect(() => {
        const map = (u: FirebaseUser | null): AuthUser | null =>
            u ? { uid: u.uid, email: u.email ?? null, emailVerified: u.emailVerified } : null;

        const unsub = onAuthStateChanged(auth, (u) => setUser(map(u)));
        return unsub;
    }, []);

    // Reflect server-provided user if it changes (rare)
    useEffect(() => {
        setUser(value ?? null);
    }, [value]);

    // If this is a protected subtree and auth is lost on the client, redirect and don't render children
    const redirecting = initiallyAuthed && user === null;

    useEffect(() => {
        if (redirecting) {
            const next =
                typeof window !== "undefined"
                    ? window.location.pathname + window.location.search
                    : "/home";
            router.replace(`/login?next=${encodeURIComponent(next)}`);
        }
    }, [redirecting, router]);

    if (redirecting) return null; // prevent children from rendering during logout

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Nullable hook for optional-auth routes */
export function useUser() {
    return useContext(UserContext);
}

/** Non-nullable hook for protected routes */
export function useAuthUser(): AuthUser {
    const user = useContext(UserContext);
    if (!user) {
        throw new Error("useAuthUser must be used within an authenticated tree");
    }
    return user;
}