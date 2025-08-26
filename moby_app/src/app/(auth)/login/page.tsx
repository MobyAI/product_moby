"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Form from "../form";
import {
    handleEmailPasswordLogin,
    handleGoogleLogin,
} from "@/lib/api/auth";
import { checkUserProfileExists } from "@/lib/firebase/client/user";

export default function LoginPage() {
    const search = useSearchParams();
    const router = useRouter();
    const next = search.get("next") || "/home";

    async function handleSuccessfulLogin() {
        // Check if user has completed profile
        const hasProfile = await checkUserProfileExists();

        if (!hasProfile) {
            router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
        } else {
            router.replace(next);
        }
    }

    return (
        <Form
            mode="login"
            onGoogle={async () => {
                const res = await handleGoogleLogin();
                if (res.success) {
                    await handleSuccessfulLogin();
                } else {
                    alert(res.error);
                }
            }}
            onEmailPassword={async (email, password) => {
                const res = await handleEmailPasswordLogin(email, password);
                if (res.success) {
                    await handleSuccessfulLogin();
                } else {
                    alert(res.error);
                }
            }}
            switchHref={`/signup?next=${encodeURIComponent(next)}`}
            switchText="Don't have an account?"
            switchCta="Create one"
        />
    );
}