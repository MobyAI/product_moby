"use client";

import { useEffect, useState, Suspense } from "react";
import { getAllScripts } from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";
import type { ScriptDoc } from "@/types/script";
import type { BasicError } from "@/types/error";
import { toBasicError } from "@/types/error";
import { Layout, LogoutButton } from "@/components/ui";

function ScriptsListContent() {
    const { uid } = useAuthUser();
    const userID = uid;

    const [authReady, setAuthReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<BasicError | null>(null);
    const [allScripts, setAllScripts] = useState<ScriptDoc[]>([]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthReady(true);
            }
        });

        return () => unsubscribe();
    }, []);

    const loadScripts = async () => {
        setLoading(true);
        setError(null);

        try {
            const scripts = await getAllScripts();
            console.log('all scripts: ', scripts);
            setAllScripts(scripts);
        } catch (e: unknown) {
            const err = toBasicError(e);
            console.error("User scripts fetch failed:", err);
            setError(err);
            setAllScripts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!userID || !authReady) return;

        loadScripts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authReady, userID]);

    return (
        <Layout>
            <LogoutButton />

            {loading && (
                <p className="text-gray-600">Getting your saved scripts for you!</p>
            )}

            {!loading && error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-4 mb-4">
                    <p className="text-red-700 font-medium">Failed to load scripts</p>
                    <button
                        onClick={loadScripts}
                        className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                    >
                        {"Retry 🔄"}
                    </button>
                </div>
            )}

            {!loading && !error && allScripts.length === 0 && (
                <p className="text-gray-600">No saved scripts yet. Upload one to get started!</p>
            )}

            {!loading && !error && allScripts.length > 0 && (
                <ul className="space-y-2">
                    {allScripts.map((s) => (
                        <li key={s.ownerUid} className="rounded-md border p-3">
                            <div className="font-medium">{s.ownerUid}</div>
                            {/* render more fields as needed */}
                        </li>
                    ))}
                </ul>
            )}
        </Layout>
    )
}

export default function ScriptsListPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading scripts...</p>
                </div>
            </div>
        }>
            <ScriptsListContent />
        </Suspense>
    );
}