import { redirect } from "next/navigation";
import { verifyUserInfo, isAuthenticated, hasProfile } from "@/lib/firebase/admin/auth/verifySession";
import { UserProvider, type AuthUser } from "./UserProvider";

export default async function ServerAuthProvider({
    children,
    requireProfile = true
}: {
    children: React.ReactNode;
    requireProfile?: boolean;
}) {
    const userStatus = await verifyUserInfo();

    if (!isAuthenticated(userStatus)) {
        redirect("/login");
    }

    if (requireProfile && !hasProfile(userStatus)) {
        redirect("/onboarding");
    }

    if (!requireProfile && hasProfile(userStatus)) {
        // redirect if user goes to onboarding page and has profile already
        // redirect("/scripts/list");
        redirect("/tracker");
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