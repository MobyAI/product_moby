"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getAllScripts, deleteScript } from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import type { ScriptDocWithId } from "@/types/script";
import type { BasicError } from "@/types/error";
import { toBasicError } from "@/types/error";
import ScriptUploadModal from "./uploadModal";
import { ConfirmModal, ScriptCard, Button } from "@/components/ui";
import UploadForm from "../upload/uploadFile";
import { Plus } from "lucide-react";

function ScriptsListContent() {
    const { uid } = useAuthUser();
    const userID = uid;
    const router = useRouter();

    // List page setup
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

    const loadScripts = async () => {
        setLoading(true);
        setError(null);

        try {
            const scripts = await getAllScripts();
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
        if (!userID) return;

        loadScripts();
    }, [userID]);

    return (
        <div className="h-full flex items-center justify-center">
            <div className="w-full h-full flex flex-col py-8">
                {/* Loading State */}
                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-gray-600">Getting your saved scripts for you!</p>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="rounded-md border border-red-200 bg-red-50 p-4">
                            <p className="text-red-700 font-medium">Failed to load scripts</p>
                            <button
                                onClick={loadScripts}
                                className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
                            >
                                {"Retry 🔄"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Empty State - Upload Form */}
                {!loading && !error && hasFetched && allScripts.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <UploadForm onFileUpload={handleFileSelect} />
                    </div>
                )}

                {/* Scripts List */}
                {!loading && !error && allScripts.length > 0 && (
                    <div className="h-full flex flex-col w-[75%] mx-auto">
                        {/* Header with Add Button */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-primary text-header-2">Your Scripts</h2>
                            <Button
                                onClick={handleFileSelect}
                                variant="accent"
                                size="md"
                                icon={Plus}
                            >
                                Add Script
                            </Button>
                        </div>

                        {/* Scrollable Scripts List */}
                        <div className="flex-1 overflow-y-auto pr-2">
                            <ul className="space-y-3">
                                {allScripts.map((s) => {
                                    console.log('script list item: ', s);
                                    return (
                                        <ScriptCard
                                            key={s.id}
                                            name={s.name}
                                            createdAt={s.createdAt}
                                            lastPracticed={s.lastPracticed}
                                            handleDelete={() => handleDeleteClick(s.id)}
                                            handlePractice={() => router.push(`/scripts/practice?scriptID=${s.id}`)}
                                        />
                                    )
                                })}
                            </ul>
                        </div>
                    </div>
                )}

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

                {/* Upload Modal */}
                <ScriptUploadModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    file={selectedFile}
                    onComplete={loadScripts}
                />
            </div>
        </div>
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