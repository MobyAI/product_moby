/* eslint-disable @typescript-eslint/no-explicit-any */
export async function extractRolesFromText(
    text: string,
    showToast?: (options: any) => void
): Promise<string[] | null> {
    if (!text || !text.trim()) {
        console.error("extractRolesFromText: empty text");
        return null;
    }

    try {
        const res = await fetch("/api/roles", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({ text }),
            credentials: 'include'
        });

        if (!res.ok) {
            if (res.status === 401) {
                if (showToast) {
                    showToast({
                        header: "Session has expired",
                        line1: "Please try logging in again",
                        type: "danger",
                    });
                }
                await fetch('/api/sessionLogout', {
                    method: 'POST',
                    credentials: 'include'
                });

                setTimeout(() => {
                    window.location.href = '/login';
                }, 3500);

                throw new Error('Unauthorized');
            }
            console.error("Failed to extract roles:", await res.text());
            return null;
        }

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.includes("application/json")) {
            console.warn("Expected JSON response but got:", contentType);
            return null;
        }

        // Expected shape: { roles: string[], parseId?: string }
        const data: unknown = await res.json();

        const roles = normalizeRolesField(data);
        if (!roles) return null;

        return roles;
    } catch (error) {
        console.error("Error extracting roles:", error);
        return null;
    }
}

function isStringArray(x: unknown): x is string[] {
    return Array.isArray(x) && x.every((v) => typeof v === "string");
}

function normalizeRolesField(data: unknown): string[] | null {
    let roles: unknown = (data as Record<string, unknown> | null)?.roles;

    // Back-compat: if an older handler returns a JSON string
    if (typeof roles === "string") {
        try {
            roles = JSON.parse(roles);
        } catch (err) {
            console.error("Failed to parse `roles` JSON:", err);
            return null;
        }
    }

    if (!isStringArray(roles)) {
        console.error(
            "Invalid `roles` payload (expected string[])",
            { rolesSample: Array.isArray(roles) ? roles.slice(0, 5) : roles }
        );
        return null;
    }

    return roles;
}