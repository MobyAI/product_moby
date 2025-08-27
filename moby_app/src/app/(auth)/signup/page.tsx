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
    const next = search.get("next") || "/home";
    const onboardingUrl = `/onboarding?next=${encodeURIComponent(next)}`;

    return (
        <Form
            mode="signup"
            onGoogle={async () => {
                const res = await handleGoogleLogin();
                if (res.success) {
                    router.replace(onboardingUrl);
                } else {
                    alert(res.error);
                    throw new Error(res.error || "Failed to save profile");
                }
            }}
            onEmailPassword={async (email, password) => {
                const res = await handleEmailPasswordRegister(email, password);
                if (res.success) {
                    router.replace(onboardingUrl);
                } else {
                    alert(res.error);
                    throw new Error(res.error);
                }
            }}
            switchHref={`/login?next=${encodeURIComponent(next)}`}
            switchText="Already have an account?"
            switchCta="Sign in"
        />
    );
}