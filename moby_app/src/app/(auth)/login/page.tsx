"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Form from "../form";
import {
    handleEmailPasswordLogin,
    handleGoogleLogin,
} from "@/lib/api/auth";
import { checkUserProfileExists } from "@/lib/firebase/client/user";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";

type AuthResult = { success: true } | { success: false; error: string };

export default function LoginPage() {
    const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const search = useSearchParams();
    const router = useRouter();
    // const next = search.get("next") || "home";
    // const next = search.get("next") || "/scripts/list";
    const next = search.get("next") || "/tracker";

    async function handleSuccessfulLogin() {
        // Check if user has completed profile
        const hasProfile = await checkUserProfileExists();

        if (!hasProfile) {
            router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
        } else {
            router.replace(next);
        }
    }

    async function handleGoogleLoginFlow(): Promise<AuthResult & { needsPasswordSetup?: boolean }> {
        const res = await handleGoogleLogin();

        if (!res.success) {
            return res;
        }

        // Get the current user from Firebase Auth
        const currentUser = auth.currentUser;

        if (currentUser) {
            // Check if password provider exists
            const hasPassword = currentUser.providerData.some(
                p => p.providerId === 'password'
            );

            if (!hasPassword) {
                // Show password setup form
                setUserEmail(currentUser.email || '');
                setNeedsPasswordSetup(true);
                return { success: true, needsPasswordSetup: true };
            }
        }

        return { success: true };
    }

    // Show password setup form if needed
    if (needsPasswordSetup) {
        return (
            <Form
                mode="password-setup"
                userEmail={userEmail}
                onPasswordSetup={async (password) => {
                    const user = auth.currentUser;
                    if (user) {
                        await updatePassword(user, password);
                        await handleSuccessfulLogin();
                    }
                }}
                switchHref={next} // Skip button goes to the next page
            />
        );
    }

    return (
        <Form
            mode="login"
            onGoogle={async () => {
                const res = await handleGoogleLoginFlow();
                if (res.success && !res.needsPasswordSetup) {
                    await handleSuccessfulLogin();
                } else if (!res.success) {
                    if (res.error?.includes('popup-closed-by-user')) {
                        return;
                    }
                    throw new Error("Google sign-in failed.");
                }
            }}
            onEmailPassword={async (email, password) => {
                const res = await handleEmailPasswordLogin(email, password);
                if (res.success) {
                    await handleSuccessfulLogin();
                } else {
                    throw new Error("Email/password sign-in failed.");
                }
            }}
            switchHref={`/signup?next=${encodeURIComponent(next)}`}
            switchText="Don't have an account?"
            switchCta="Create one"
        />
    );
}