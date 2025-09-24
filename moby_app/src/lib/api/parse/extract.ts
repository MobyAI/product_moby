/* eslint-disable @typescript-eslint/no-explicit-any */
export async function extractScriptText(
    file: File,
    showToast?: (options: any) => void
): Promise<{
    parseId: string;
    name: string;
    ext?: string;
    text: string;
}> {
    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/extract", {
        method: "POST",
        body: fd,
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
        throw new Error(`Extract failed: ${res.status}`);
    }

    return res.json();
}