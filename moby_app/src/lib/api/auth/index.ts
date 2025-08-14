import {
    loginWithGoogle,
    loginWithEmailPassword,
    registerWithEmailPassword,
    logout as firebaseLogout,
} from "@/server/auth/client";

type AuthResult = { success: true } | { success: false; error: string };

const errMsg = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

async function sendSessionLogin(idToken: string): Promise<AuthResult> {
    try {
        const res = await fetch("/api/sessionLogin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken }),
        });

        if (!res.ok) {
            try {
                const data = await res.json();
                const msg =
                    (typeof data?.error === "string" && data.error) ||
                    (typeof data?.message === "string" && data.message) ||
                    "Failed to start session";
                return { success: false, error: msg };
            } catch {
                const text = await res.text();
                return { success: false, error: text || "Failed to start session" };
            }
        }

        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: errMsg(err, "Network error") };
    }
}

export async function handleGoogleLogin(): Promise<AuthResult> {
    try {
        const result = await loginWithGoogle();
        const idToken = await result.user.getIdToken(true);

        const loginResult = await sendSessionLogin(idToken);
        if (!loginResult.success) return loginResult;

        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: errMsg(err, "Google login failed") };
    }
}

export async function handleEmailPasswordLogin(
    email: string,
    password: string
): Promise<AuthResult> {
    try {
        const result = await loginWithEmailPassword(email, password);
        const idToken = await result.user.getIdToken(true);

        const loginResult = await sendSessionLogin(idToken);
        if (!loginResult.success) return loginResult;

        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: errMsg(err, "Invalid email or password") };
    }
}

export async function handleEmailPasswordRegister(
    email: string,
    password: string
): Promise<AuthResult> {
    try {
        const result = await registerWithEmailPassword(email, password);
        const idToken = await result.user.getIdToken(true);

        const loginResult = await sendSessionLogin(idToken);
        if (!loginResult.success) return loginResult;

        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: errMsg(err, "Registration failed") };
    }
}

export async function handleLogout(): Promise<AuthResult> {
    try {
        await firebaseLogout();

        await fetch("/api/sessionLogout", { method: "POST" });

        return { success: true };
    } catch (err: unknown) {
        return { success: false, error: errMsg(err, "Logout failed") };
    }
}

export async function checkSession() {
    try {
        const res = await fetch("/api/sessionCheck", {
            method: "GET",
            credentials: "include",
        });

        if (!res.ok) {
            return { authenticated: false };
        }

        const data = await res.json();
        return data;
    } catch (err: unknown) {
        console.error("❌ Session check failed", err);
        return { authenticated: false };
    }
}