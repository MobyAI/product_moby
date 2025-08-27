export const runtime = 'nodejs';

import 'server-only';
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin/config/app";

export type UserInfoStatus =
    | { authenticated: false }
    | { authenticated: true; hasProfile: false; uid: string }
    | { authenticated: true; hasProfile: true; uid: string };

export async function verifySession() {
    try {
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get("__session")?.value;

        if (!sessionCookie) return null;

        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
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
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);

        // Check if user profile exists and has required fields
        const userDoc = await adminDb
            .collection("users")
            .doc(decodedClaims.uid)
            .get();

        // Check if document exists and has all required profile fields
        if (userDoc.exists) {
            const userData = userDoc.data();
            const requiredFields = ['firstName', 'lastName', 'age', 'height', 'ethnicity'];

            const hasCompleteProfile = requiredFields.every(field =>
                userData?.[field] !== undefined &&
                userData[field] !== null &&
                userData[field] !== ''
            );

            if (hasCompleteProfile) {
                // User is authenticated AND has complete profile
                return {
                    authenticated: true,
                    hasProfile: true,
                    uid: decodedClaims.uid,
                };
            }
        }

        // User is authenticated but doesn't have complete profile
        return {
            authenticated: true,
            hasProfile: false,
            uid: decodedClaims.uid
        };

    } catch (error) {
        console.error("Session verification error:", error);
        return { authenticated: false };
    }
}

// Helper type guards for cleaner usage
export function isAuthenticated(status: UserInfoStatus): status is
    | { authenticated: true; hasProfile: false; uid: string }
    | { authenticated: true; hasProfile: true; uid: string } {
    return status.authenticated === true;
}

export function hasProfile(status: UserInfoStatus): status is
    { authenticated: true; hasProfile: true; uid: string } {
    return status.authenticated === true && status.hasProfile === true;
}