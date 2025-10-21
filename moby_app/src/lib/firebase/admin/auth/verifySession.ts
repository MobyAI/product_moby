export const runtime = "nodejs";

import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin/config/app";

export type UserInfoStatus =
  | { authenticated: false }
  | {
      authenticated: true;
      hasProfile: false;
      uid: string;
      accessLevel?: "no_access" | "beta" | "paid" | "expired";
      betaExpiresAt?: number;
      admin?: boolean;
    }
  | {
      authenticated: true;
      hasProfile: true;
      uid: string;
      accessLevel?: "no_access" | "beta" | "paid" | "expired";
      betaExpiresAt?: number;
      admin?: boolean;
    };

export async function verifySession() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) return null;

    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );
    return decodedClaims;
  } catch (error) {
    console.error("❌ Invalid or expired session cookie", error);
    return null;
  }
}

export async function verifyUserInfo(): Promise<UserInfoStatus> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("__session")?.value;

    if (!sessionCookie) {
      return { authenticated: false };
    }

    // Verify the session cookie
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    // Extract access level from custom claims
    const accessLevel = decodedClaims.accessLevel as
      | "no_access"
      | "beta"
      | "paid"
      | "expired"
      | undefined;
    const betaExpiresAt = decodedClaims.betaExpiresAt as number | undefined;
    const admin = decodedClaims.admin as boolean | undefined;

    // Check if user profile exists and has required fields
    const userDoc = await adminDb
      .collection("users")
      .doc(decodedClaims.uid)
      .get();

    // Check if document exists and has all required profile fields
    if (userDoc.exists) {
      const userData = userDoc.data();
      const requiredFields = [
        "firstName",
        "lastName",
        "age",
        "height",
        "ethnicity",
      ];

      const hasCompleteProfile = requiredFields.every(
        (field) =>
          userData?.[field] !== undefined &&
          userData[field] !== null &&
          userData[field] !== ""
      );

      if (hasCompleteProfile) {
        // User is authenticated AND has complete profile
        return {
          authenticated: true,
          hasProfile: true,
          uid: decodedClaims.uid,
          accessLevel,
          betaExpiresAt,
          admin,
        };
      }
    }

    // User is authenticated but doesn't have complete profile
    return {
      authenticated: true,
      hasProfile: false,
      uid: decodedClaims.uid,
      accessLevel,
      betaExpiresAt,
      admin,
    };
  } catch (error) {
    console.error("Session verification error:", error);
    return { authenticated: false };
  }
}

// Helper type guards for cleaner usage
export function isAuthenticated(status: UserInfoStatus): status is
  | {
      authenticated: true;
      hasProfile: false;
      uid: string;
      accessLevel?: "no_access" | "beta" | "paid" | "expired";
      betaExpiresAt?: number;
    }
  | {
      authenticated: true;
      hasProfile: true;
      uid: string;
      accessLevel?: "no_access" | "beta" | "paid" | "expired";
      betaExpiresAt?: number;
    } {
  return status.authenticated === true;
}

export function hasProfile(status: UserInfoStatus): status is {
  authenticated: true;
  hasProfile: true;
  uid: string;
  accessLevel?: "no_access" | "beta" | "paid" | "expired";
  betaExpiresAt?: number;
} {
  return status.authenticated === true && status.hasProfile === true;
}

// Check if user has active access (beta or paid)
export function hasAccess(status: UserInfoStatus): boolean {
  if (!isAuthenticated(status)) return false;

  const { accessLevel, betaExpiresAt } = status;

  // Admin bypass - always has access
  if (status.admin) return true;

  // No access level set yet (shouldn't happen with Cloud Function, but safe check)
  if (!accessLevel) return false;

  // Paid users always have access
  if (accessLevel === "paid") return true;

  // Check beta expiration
  if (accessLevel === "beta" && betaExpiresAt) {
    const now = Date.now();
    return now < betaExpiresAt;
  }

  // no_access or expired
  return false;
}

// Get detailed access status (useful for debugging or showing info)
export function getAccessStatus(status: UserInfoStatus): {
  hasAccess: boolean;
  reason: "paid" | "beta" | "expired" | "no_access";
  daysLeft?: number;
} {
  if (!isAuthenticated(status)) {
    return { hasAccess: false, reason: "no_access" };
  }

  const { accessLevel, betaExpiresAt } = status;

  if (accessLevel === "paid") {
    return { hasAccess: true, reason: "paid" };
  }

  if (accessLevel === "beta" && betaExpiresAt) {
    const now = Date.now();

    if (now < betaExpiresAt) {
      const daysLeft = Math.ceil((betaExpiresAt - now) / (1000 * 60 * 60 * 24));
      return { hasAccess: true, reason: "beta", daysLeft };
    } else {
      return { hasAccess: false, reason: "expired" };
    }
  }

  return { hasAccess: false, reason: "no_access" };
}
