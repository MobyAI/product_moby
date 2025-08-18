import { verifySession } from "@/lib/firebase/admin/auth/verifySession";

export async function GET() {
    const user = await verifySession();

    if (!user) {
        return Response.json({ authenticated: false });
    }

    return Response.json({ authenticated: true, user });
}