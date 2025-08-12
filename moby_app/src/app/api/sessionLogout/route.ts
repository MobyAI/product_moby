import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.set("__session", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 0,
            path: "/",
            sameSite: "strict",
        });

        return new Response(
            JSON.stringify({ success: true, message: "Session cleared" }),
            { status: 200 }
        );
    } catch (err) {
        console.error("Error in sessionLogout:", err);
        return new Response(
            JSON.stringify({ error: "Failed to clear session" }),
            { status: 500 }
        );
    }
}