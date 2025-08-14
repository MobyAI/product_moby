"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
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
    value: AuthUser | null;
    children: React.ReactNode;
}) {
    const [user, setUser] = useState<AuthUser | null>(value ?? null);

    // Keep context in sync with client-side Firebase Auth
    useEffect(() => {
        const map = (u: FirebaseUser | null): AuthUser | null =>
            u ? { uid: u.uid, email: u.email ?? null, emailVerified: u.emailVerified } : null;

        const unsub = onAuthStateChanged(auth, (u) => setUser(map(u)));
        return unsub;
    }, []);

    // If the server-provided user changes (rare), reflect it
    useEffect(() => {
        setUser(value ?? null);
    }, [value]);

    return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

/** Nullable hook for optional-auth routes */
export function useUser() {
    return useContext(UserContext);
}

/** Non-nullable hook for protected routes (guaranteed by ServerAuthProvider) */
export function useAuthUser(): AuthUser {
    const user = useContext(UserContext);
    if (!user) {
        throw new Error("useAuthUser must be used within an authenticated tree");
    }
    return user;
}