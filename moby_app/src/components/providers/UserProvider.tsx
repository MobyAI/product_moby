"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";
import * as Sentry from "@sentry/nextjs";

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

export interface AccessStatus {
  hasAccess: boolean;
  isAdmin?: boolean;
  reason: "paid" | "beta" | "expired" | "no_access" | "admin";
  daysLeft?: number;
}

type AuthContextValue = {
  user: AuthUser | null;
  clientReady: boolean;
  initiallyAuthed: boolean;
  accessStatus: AccessStatus | null; // NEW
};

const UserContext = createContext<AuthContextValue | null>(null);

export function UserProvider({
  value,
  children,
}: {
  value: AuthUser | null;
  children: React.ReactNode;
}) {
  const initiallyAuthed = !!value;
  const [user, setUser] = useState<AuthUser | null>(value ?? null);
  const [clientReady, setClientReady] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus | null>(null);

  // Main auth listener
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

    const unsub = onAuthStateChanged(auth, async (u) => {
      setClientReady(true);
      const mapped = map(u);
      setUser(mapped ?? (initiallyAuthed ? value : null));

      if (mapped) {
        Sentry.setUser({
          id: mapped.uid,
          email: mapped.email,
          username: mapped.displayName || mapped.email,
        });

        // Check access status
        try {
          const tokenResult = await u!.getIdTokenResult();
          const claims = tokenResult.claims;

          // Check admin first
          if (claims.admin === true) {
            setAccessStatus({
              hasAccess: true,
              reason: "admin",
              isAdmin: true,
            });
          }
          // Check paid status
          else if (claims.accessLevel === "paid") {
            setAccessStatus({ hasAccess: true, reason: "paid" });
          }
          // Check beta status
          else if (claims.accessLevel === "beta" && claims.betaExpiresAt) {
            const expiresAt = new Date(claims.betaExpiresAt as number);
            const now = new Date();

            if (now < expiresAt) {
              const daysLeft = Math.ceil(
                (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
              );
              setAccessStatus({
                hasAccess: true,
                reason: "beta",
                daysLeft,
              });
            } else {
              setAccessStatus({ hasAccess: false, reason: "expired" });
            }
          } else {
            setAccessStatus({
              hasAccess: false,
              reason:
                claims.accessLevel === "expired" ? "expired" : "no_access",
            });
          }
        } catch (error) {
          console.error("Error checking access:", error);
          setAccessStatus({ hasAccess: false, reason: "no_access" });
        }
      } else {
        Sentry.setUser(null);
        setAccessStatus(null);
      }
    });
    return unsub;
  }, [initiallyAuthed, value]);

  // Periodic token refresh
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          // Force refresh - triggers onAuthStateChanged above
          await currentUser.getIdToken(true);
          console.log("Token refreshed");
        }
      } catch (error) {
        console.error("Error refreshing token:", error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    setUser((prev) => prev ?? value ?? null);
  }, [value]);

  return (
    <UserContext.Provider
      value={{ user, clientReady, initiallyAuthed, accessStatus }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

export function useAuthUser(): AuthUser {
  const ctx = useContext(UserContext);
  if (!ctx?.user)
    throw new Error("useAuthUser must be used within an authenticated tree");
  return ctx.user;
}

export function useAuthState() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useAuthState must be used within UserProvider");
  return ctx;
}

// NEW: Hook to check if user has access
export function useAccess() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useAccess must be used within UserProvider");
  return ctx.accessStatus;
}
