"use client";

import { useSearchParams, useRouter } from "next/navigation";
import Form from "../form";
import {
    handleEmailPasswordLogin,
    handleGoogleLogin,
} from "@/lib/api/auth";

export default function LoginPage() {
    const search = useSearchParams();
    const router = useRouter();
    const next = search.get("next") || "/home";

    return (
        <Form
            mode="login"
            onGoogle={async () => {
                const res = await handleGoogleLogin();
                if (res.success) router.replace(next);
                else alert(res.error);
            }}
            onEmailPassword={async (email, password) => {
                const res = await handleEmailPasswordLogin(email, password);
                if (res.success) router.replace(next);
                else alert(res.error);
            }}
            switchHref={`/signup?next=${encodeURIComponent(next)}`}
            switchText="Don't have an account?"
            switchCta="Create one"
        />
    );
}