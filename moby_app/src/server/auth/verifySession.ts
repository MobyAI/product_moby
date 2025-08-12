import { cookies } from "next/headers";
import { adminAuth } from "@/server/firebase/admin";

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