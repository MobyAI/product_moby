"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getAllScripts, deleteScript } from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";
import type { ScriptDocWithId } from "@/types/script";
import type { BasicError } from "@/types/error";
import { toBasicError } from "@/types/error";
import { Layout, LogoutButton } from "@/components/ui";
import ScriptUploadModal from "./uploadModal";
import { ConfirmModal } from "@/components/ui";

function ScriptsListContent() {
    const { uid } = useAuthUser();
    const userID = uid;
    const router = useRouter();

    // List page setup
    const [authReady, setAuthReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [hasFetched, setHasFetched] = useState(false);
    const [error, setError] = useState<BasicError | null>(null);
    const [allScripts, setAllScripts] = useState<ScriptDocWithId[]>([]);

    // Script upload modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Delete confirm modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

    const handleFileSelect = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.docx';
        input.onchange = (e: Event) => {
            if (!e.target) return;
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) {
                setSelectedFile(file);
                setIsModalOpen(true);
            }
        };
        input.click();
    };

    const handleDeleteClick = (id: string) => {
        setScriptToDelete(id);
        setConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!scriptToDelete) return;
        try {
            await deleteScript(scriptToDelete);
            loadScripts();
        } catch (err) {
            console.error("Failed to delete script:", err);
            alert("Failed to delete script. Please try again.");
        } finally {
            setConfirmOpen(false);
            setScriptToDelete(null);
        }
    };

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
            setHasFetched(true);
        }
    };

    useEffect(() => {
        if (!userID || !authReady) return;

        loadScripts();
    }, [authReady, userID]);

    return (
        <Layout>
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

            {!loading && !error && hasFetched && (
                <>
                    <div className="flex items-center justify-between mb-6">
                        {/* Left side */}
                        <LogoutButton />

                        {/* Right side */}
                        <button
                            onClick={handleFileSelect}
                            className="bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                        >
                            Add Script
                        </button>
                    </div>

                    <ScriptUploadModal
                        isOpen={isModalOpen}
                        onClose={() => setIsModalOpen(false)}
                        file={selectedFile}
                        onComplete={loadScripts}
                    />
                </>
            )}

            {!loading && !error && hasFetched && allScripts.length === 0 && (
                <p className="text-gray-600">No saved scripts yet. Upload one to get started!</p>
            )}

            {!loading && !error && allScripts.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-semibold mb-4 text-center">Your Scripts</h2>
                    <ul className="space-y-3">
                        {allScripts.map((s) => (
                            <li
                                key={s.id}
                                className="mx-auto flex w-full max-w-md items-center justify-between rounded-md border bg-white p-4 shadow-sm"
                            >
                                <div className="font-medium">{s.name}</div>
                                <div className="space-x-2">
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteClick(s.id)}
                                        className="inline-flex items-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                    >
                                        Delete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.push(`/scripts/practice?scriptID=${s.id}`)
                                        }
                                        className="inline-flex items-center rounded-md border border-blue-300 px-3 py-1.5 text-sm text-blue-600 font-medium hover:bg-blue-100 transition"
                                        aria-label={`Practice script ${s.name}`}
                                    >
                                        Practice!
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {/* Delete Confirmation Modal */}
                    <ConfirmModal
                        isOpen={confirmOpen}
                        title="Delete Script"
                        message="Are you sure you want to delete this script? This action cannot be undone."
                        confirmLabel="Delete"
                        cancelLabel="Cancel"
                        onConfirm={confirmDelete}
                        onCancel={() => {
                            setConfirmOpen(false);
                            setScriptToDelete(null);
                        }}
                    />
                </div>
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