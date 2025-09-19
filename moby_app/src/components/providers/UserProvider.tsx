"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
// import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client/config/app";
import * as Sentry from "@sentry/nextjs";

export interface AuthUser {
    uid: string;
    email?: string;
    displayName?: string;
    photoURL?: string;
}

type AuthContextValue = {
    user: AuthUser | null;          // effective user for your app
    clientReady: boolean;           // true after first onAuthStateChanged fires
    initiallyAuthed: boolean;       // server said this subtree is protected
};

const UserContext = createContext<AuthContextValue | null>(null);

export function UserProvider({
    value,
    children,
}: {
    value: AuthUser | null; // non-null in protected trees (from ServerAuthProvider)
    children: React.ReactNode;
}) {
    // const router = useRouter();
    const initiallyAuthed = !!value;

    // Start with the server user so there is no flicker/hydration mismatch
    const [user, setUser] = useState<AuthUser | null>(value ?? null);
    const [clientReady, setClientReady] = useState(false);

    useEffect(() => {
        const map = (u: FirebaseUser | null): AuthUser | null =>
            u
                ? {
                    uid: u.uid,
                    email: u.email ?? undefined,
                    displayName: u.displayName ?? undefined,
                    photoURL: u.photoURL ?? undefined,
                }
                : null;

        const unsub = onAuthStateChanged(auth, (u) => {
            setClientReady(true);

            // If this subtree is protected by the server and the client SDK reports null,
            // keep the server user to avoid a flash/incorrect redirect.
            const mapped = map(u);
            setUser(mapped ?? (initiallyAuthed ? value : null));

            // Set Sentry user context whenever auth state changes
            if (mapped) {
                Sentry.setUser({
                    id: mapped.uid,
                    email: mapped.email,
                    username: mapped.displayName || mapped.email,
                });
            } else {
                Sentry.setUser(null); // Clear user on logout
            }
        });
        return unsub;
    }, [initiallyAuthed, value]);

    // Keep in sync if the server-provided value changes (rare)
    useEffect(() => {
        setUser((prev) => prev ?? value ?? null);
    }, [value]);

    // // If you want to redirect only in optional-auth areas:
    // useEffect(() => {
    //     // Example: for optional-auth routes, if clientReady and no user, you might redirect
    //     // For your protected /scripts subtree, server already redirected — no need here.
    // }, [clientReady, user, router]);

    return (
        <UserContext.Provider value={{ user, clientReady, initiallyAuthed }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext); // can be null in optional-auth routes
}

export function useAuthUser(): AuthUser {
    const ctx = useContext(UserContext);
    if (!ctx?.user) throw new Error("useAuthUser must be used within an authenticated tree");
    return ctx.user;
}

export function useAuthState() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useAuthState must be used within UserProvider");
    return ctx; // { user, clientReady, initiallyAuthed }
}