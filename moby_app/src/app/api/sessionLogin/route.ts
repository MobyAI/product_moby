export const runtime = "nodejs";
export const dynamic = 'force-dynamic';

import { adminAuth } from "@/lib/firebase/admin/config/app";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const { idToken } = await req.json();

        if (!idToken || typeof idToken !== "string") {
            return new Response(
                JSON.stringify({ error: "Missing or invalid idToken" }),
                { status: 400 }
            );
        }

        const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days

        const sessionCookie = await adminAuth.createSessionCookie(idToken, {
            expiresIn,
        });

        const res = NextResponse.json({ success: true, message: "Session set" });

        res.cookies.set("__session", sessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: expiresIn / 1000,
        });

        // const cookieStore = await cookies();
        // cookieStore.set("__session", sessionCookie, {
        //     httpOnly: true,
        //     secure: process.env.NODE_ENV === "production",
        //     maxAge: expiresIn / 1000, // seconds
        //     path: "/",
        //     sameSite: "lax",
        // });

        return res;
    } catch (err) {
        console.error("Error in sessionLogin:", err);
        return new Response(
            JSON.stringify({ error: "Failed to set session" }),
            { status: 500 }
        );
    }
}