import { redirect } from "next/navigation";
import { verifyUserInfo, isAuthenticated, hasProfile } from "@/lib/firebase/admin/auth/verifySession";
import { UserProvider, type AuthUser } from "./UserProvider";

export default async function ServerAuthProvider({ children }: { children: React.ReactNode }) {
    const userStatus = await verifyUserInfo();
    console.log('user status: ', userStatus);

    if (!isAuthenticated(userStatus)) {
        redirect("/login");
    }

    if (!hasProfile(userStatus)) {
        redirect("/onboarding");
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