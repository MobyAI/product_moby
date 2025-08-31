"use client";

import { useState } from "react";

type Props = {
    mode: "login" | "signup";
    onGoogle: () => Promise<void>;
    onEmailPassword: (email: string, password: string) => Promise<void>;
    switchHref: string;
    switchText: string;
    switchCta: string;
};

export default function Form({
    mode,
    onGoogle,
    onEmailPassword,
    switchHref,
    switchText,
    switchCta,
}: Props) {
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [loading, setLoading] = useState<null | "google" | "email">(null);
    const [error, setError] = useState<string | null>(null);

    async function submitEmail(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        if (!email || !pw) {
            setError("Email and password are required.");
            return;
        }
        try {
            setLoading("email");
            await onEmailPassword(email, pw);
        } catch {
            setError("Sign in failed. Please check your email/password and try again.");
        } finally {
            setLoading(null);
        }
    }

    async function submitGoogle() {
        setError(null);
        try {
            setLoading("google");
            await onGoogle();
        } catch {
            setError("Google sign in failed.");
        } finally {
            setLoading(null);
        }
    }

    const title = mode === "login" ? "Sign in" : "Create your account";

    if (loading !== null) {
        return (
            <>
                <div className="w-20 h-20 mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin"></div>
                    <div
                        className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin"
                        style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
                    />
                </div>
                <p className="text-gray-700 text-lg font-medium">Signing you in…</p>
            </>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">{title}</h1>

            <div className="flex justify-center">
                <button
                    className="gsi-material-button"
                    style={{ width: 300 }}
                    onClick={submitGoogle}
                    disabled={loading !== null}
                >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                            <svg
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 48 48"
                                xmlnsXlink="http://www.w3.org/1999/xlink"
                                style={{ display: "block" }}
                            >
                                <path
                                    fill="#EA4335"
                                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0
          14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5
          24 9.5z"
                                />
                                <path
                                    fill="#4285F4"
                                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94
          c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6
          c4.51-4.18 7.09-10.36 7.09-17.65z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19
          C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6
          c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98
          6.19C6.51 42.62 14.62 48 24 48z"
                                />
                                <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                        </div>
                        <span className="gsi-material-button-contents">Continue with Google</span>
                        <span style={{ display: "none" }}>Continue with Google</span>
                    </div>
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                </div>
            </div>

            <form onSubmit={submitEmail} className="space-y-3">
                <input
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    className="w-full rounded-md border px-3 py-2"
                />
                <input
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="Password"
                    value={pw}
                    onChange={(e) => setPw(e.currentTarget.value)}
                    className="w-full rounded-md border px-3 py-2"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={loading !== null}
                    className="w-full rounded-lg bg-black text-white px-4 py-2"
                >
                    {loading === "email"
                        ? mode === "login"
                            ? "Signing in…"
                            : "Creating account…"
                        : mode === "login"
                            ? "Sign in with email"
                            : "Create account"}
                </button>
            </form>

            <p className="text-sm text-gray-600">
                {switchText}{" "}
                <a href={switchHref} className="underline">
                    {switchCta}
                </a>
            </p>
        </div>
    );
}