"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getAllScripts, deleteScript } from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import ScriptUploadModal from "./uploadModal";
import { DashboardLayout, ConfirmModal, ScriptCard, Button, LoadingScreen } from "@/components/ui";
import UploadForm from "../upload/uploadFile";
import { Plus, RotateCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";

function ScriptsListContent() {
    const { uid } = useAuthUser();
    const userID = uid;
    const router = useRouter();
    const { showToast } = useToast();

    // List page setup
    const [isDeleting, setIsDeleting] = useState(false);

    // Script upload modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Delete confirm modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [scriptToDelete, setScriptToDelete] = useState<string | null>(null);

    // TanStack Query for fetching scripts
    const queryClient = useQueryClient();
    const {
        data: allScripts = [],
        isLoading: loading,
        error,
        isFetched,
        // refetch: loadScripts
    } = useQuery({
        queryKey: ['scripts', userID],
        queryFn: getAllScripts,
        enabled: !!userID, // Only run query if userID exists
        staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    });

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

        setIsDeleting(true);

        try {
            await deleteScript(scriptToDelete);

            showToast({
                header: "Script deleted!",
                type: "success",
            });

            // Invalidate cache to refetch updated list
            await queryClient.invalidateQueries({ queryKey: ['scripts', userID] });
        } catch (err) {
            console.error("Failed to delete script:", err);
            Sentry.captureException(err);
            showToast({
                header: "Failed to delete script",
                line1: "Please try again",
                type: "danger",
            });
        } finally {
            setConfirmOpen(false);
            setScriptToDelete(null);
            setIsDeleting(false);
        }
    };

    const handleUploadSuccess = async () => {
        setSelectedFile(null);

        showToast({
            header: "New script uploaded!",
            type: "success",
        });

        // Refetch scripts list after upload
        await queryClient.invalidateQueries({ queryKey: ['scripts', userID] });
    };

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['scripts', userID] });
    };

    // Loading state
    if (loading) {
        return (
            <LoadingScreen
                header="Scripts"
                message="Grabbing your uploads"
                mode="light"
            />
        );
    }

    return (
        <DashboardLayout maxWidth={75}>

            {/* Error State */}
            {error && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col justify-center items-center space-y-4 rounded-md border border-red-200 bg-red-50 p-8">
                        <p className="text-lg text-red-700 font-medium">Failed to load scripts</p>
                        <Button
                            onClick={handleRefresh}
                            size="md"
                            variant="primary"
                            icon={RotateCcw}
                        >
                            Retry
                        </Button>
                    </div>
                </div>
            )}

            {/* Empty State - Upload Form */}
            {!error && isFetched && allScripts.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                    <UploadForm onFileUpload={handleFileSelect} />
                </div>
            )}

            {/* Scripts List */}
            {!error && allScripts.length > 0 && (
                <div className="h-full flex flex-col">
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
                isProcessing={isDeleting}
            />

            {/* Upload Modal */}
            <ScriptUploadModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                file={selectedFile}
                onComplete={handleUploadSuccess}
            />
        </DashboardLayout>
    )
}

export default function ScriptsListPage() {
    return (
        <Suspense fallback={
            <LoadingScreen
                header="Scripts"
                message="Grabbing your uploads"
                mode="light"
            />
        }>
            <ScriptsListContent />
        </Suspense>
    );
}