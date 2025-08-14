"use client";
import { createContext, useContext } from "react";

export type AuthUser = {
    uid: string;
    email: string;
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
    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
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