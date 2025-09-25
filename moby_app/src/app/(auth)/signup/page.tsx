"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import Form from "../form";
import {
    handleEmailPasswordRegister,
    handleGoogleLogin,
    sendSessionLogin,
} from "@/lib/api/auth";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";

type AuthResult = { success: true } | { success: false; error: string };

export default function SignupPage() {
    const search = useSearchParams();
    const router = useRouter();
    const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
    const [userEmail, setUserEmail] = useState("");

    const next = search.get("next") || "/tracker";
    const onboardingUrl = `/onboarding?next=${encodeURIComponent(next)}`;

    async function handleGoogleSignupFlow(): Promise<AuthResult & { needsPasswordSetup?: boolean }> {
        const res = await handleGoogleLogin();

        if (!res.success) {
            return res;
        }

        const currentUser = auth.currentUser;

        if (currentUser) {
            // Check if password provider exists
            const hasPassword = currentUser.providerData.some(
                p => p.providerId === 'password'
            );

            if (!hasPassword) {
                // For existing users who don't have password, offer to add it
                // For new users signing up with Google, also offer to add password
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

                        // IMPORTANT: Refresh the session cookie after password update
                        const newIdToken = await user.getIdToken(true); // force refresh
                        const sessionResult = await sendSessionLogin(newIdToken);

                        if (sessionResult.success) {
                            router.replace(onboardingUrl);
                        } else {
                            throw new Error("Failed to refresh session after password update");
                        }
                    }
                }}
                switchHref={onboardingUrl} // Skip button continues to onboarding
            />
        );
    }

    return (
        <Form
            mode="signup"
            onGoogle={async () => {
                const res = await handleGoogleSignupFlow();

                if (res.success) {
                    if (!res.needsPasswordSetup) {
                        router.replace(onboardingUrl);
                    }
                    // If needsPasswordSetup is true, the state change will show the password form
                } else {
                    if (res.error?.includes('popup-closed-by-user')) {
                        return;
                    }
                    throw new Error(res.error || "Failed to sign up");
                }
            }}
            onEmailPassword={async (email, password) => {
                const res = await handleEmailPasswordRegister(email, password);
                if (res.success) {
                    // Email/password signup already has password, go straight to onboarding
                    router.replace(onboardingUrl);
                } else {
                    throw new Error(res.error);
                }
            }}
            switchHref={`/login?next=${encodeURIComponent(next)}`}
            switchText="Already have an account?"
            switchCta="Sign in"
        />
    );
}