import { redirect } from "next/navigation";
import { verifyUserInfo, isAuthenticated, hasProfile } from "@/lib/firebase/admin/auth/verifySession";
import { UserProvider, type AuthUser } from "./UserProvider";

export default async function ServerAuthProvider({ children }: { children: React.ReactNode }) {
    const userStatus = await verifyUserInfo();

    if (!isAuthenticated(userStatus)) {
        redirect("/login?next=/home");
    }

    if (!hasProfile(userStatus)) {
        redirect("/onboarding?next=/home");
    }

    const value: AuthUser = {
        uid: userStatus.uid
    };

    return (
        <UserProvider value={value}>
            {children}
        </UserProvider>
    );
}