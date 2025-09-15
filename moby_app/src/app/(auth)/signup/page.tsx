"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Form from "../form";
import {
    handleEmailPasswordRegister,
    handleGoogleLogin,
} from "@/lib/api/auth";

export default function SignupPage() {
    const search = useSearchParams();
    const router = useRouter();
    // const next = search.get("next") || "home";
    // const next = search.get("next") || "/scripts/list";
    const next = search.get("next") || "/tracker";
    const onboardingUrl = `/onboarding?next=${encodeURIComponent(next)}`;

    return (
        <Form
            mode="signup"
            onGoogle={async () => {
                const res = await handleGoogleLogin();
                if (res.success) {
                    router.replace(onboardingUrl);
                } else {
                    if (res.error?.includes('popup-closed-by-user')) {
                        return;
                    }
                    throw new Error(res.error || "Failed to save profile");
                }
            }}
            onEmailPassword={async (email, password) => {
                const res = await handleEmailPasswordRegister(email, password);
                if (res.success) {
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