import { redirect } from "next/navigation";
import { verifySession } from "@/server/auth/verifySession";
import { UserProvider, type AuthUser } from "./UserProvider";

export default async function ServerAuthProvider({ children }: { children: React.ReactNode }) {
    const user = await verifySession();
    if (!user) redirect("/login?next=/home");

    const value: AuthUser = {
        uid: user.uid,
        email: user.email ?? null,
        emailVerified: !!user.emailVerified,
    };

    return (
        <UserProvider value={value}>
            {children}
        </UserProvider>
    );
}