"use client";

import { useMemo, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getAllScripts, deleteScript } from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import ScriptUploadModal from "./uploadModal";
import {
  DashboardLayout,
  ScriptCard,
  Button,
  LoadingScreen,
} from "@/components/ui";
import Dialog, { useDialog } from "@/components/ui/Dialog";
import UploadForm from "../upload/uploadFile";
import { Plus, RotateCcw, Search, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";
import { Timestamp } from "firebase/firestore";
import type { ScriptElement } from "@/types/script";

export interface ScriptData {
  id: string;
  name: string;
  script: ScriptElement[];
  ownerUid: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  lastPracticed: Timestamp | null;
}

const bgColors = [
  "bg-accent-purple",
  "bg-accent-pink",
  "bg-accent-orange",
  "bg-accent-blue",
];

function ScriptsListContent() {
  const { uid } = useAuthUser();
  const userID = uid;
  const router = useRouter();
  const { showToast } = useToast();
  const { dialogProps, openConfirm } = useDialog();

  // Script upload modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // TanStack Query for fetching scripts
  const queryClient = useQueryClient();
  const {
    data: allScripts = [],
    isLoading: loading,
    error,
    isFetched,
    // refetch: loadScripts
  } = useQuery({
    queryKey: ["scripts", userID],
    queryFn: getAllScripts,
    enabled: !!userID, // Only run query if userID exists
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx";
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
    openConfirm(
      "Delete Script",
      "Are you sure you want to delete this script? This action cannot be undone.",
      async () => {
        try {
          await deleteScript(id);

          showToast({
            header: "Script deleted!",
            type: "success",
          });

          // Invalidate cache to refetch updated list
          await queryClient.invalidateQueries({
            queryKey: ["scripts", userID],
          });
        } catch (err) {
          console.error("Failed to delete script:", err);
          Sentry.captureException(err);
          showToast({
            header: "Failed to delete script",
            line1: "Please try again",
            type: "danger",
          });
        }
      },
      { type: "delete" }
    );
  };

  const handleUploadSuccess = async () => {
    setSelectedFile(null);

    showToast({
      header: "New script uploaded!",
      type: "success",
    });

    // Refetch scripts list after upload
    await queryClient.invalidateQueries({ queryKey: ["scripts", userID] });
  };

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["scripts", userID] });
  };

  // Filter scripts based on search term
  const visibleScripts = useMemo(() => {
    if (!searchTerm.trim()) return allScripts;
    const lower = searchTerm.toLowerCase();
    return allScripts.filter((s) => s.name.toLowerCase().includes(lower));
  }, [allScripts, searchTerm]);

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

  // Error state
  if (error) {
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col justify-center items-center space-y-4 rounded-md border border-red-200 bg-red-50 p-8">
        <p className="text-lg text-red-700 font-medium">
          Failed to load scripts
        </p>
        <Button
          onClick={handleRefresh}
          size="md"
          variant="primary"
          icon={RotateCcw}
        >
          Retry
        </Button>
      </div>
    </div>;
  }

  return (
    <DashboardLayout maxWidth={90}>
      {/* Empty State - Upload Form */}
      {isFetched && allScripts.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <UploadForm onFileUpload={handleFileSelect} />
        </div>
      )}

      {/* Scripts List */}
      {allScripts.length > 0 && (
        <div className="flex flex-col mx-[0%] min-h-0 flex-1">
          {/* Right-side controls (search + add) - Positioned at top right */}
          <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
            {/* Search input with expand/collapse */}
            <div className="flex items-center">
              <div
                className={`flex items-center transition-all duration-300 ease-in-out border rounded-md mr-1 overflow-hidden ${
                  showSearch
                    ? "w-80 border-gray-300 bg-white"
                    : "w-0 border-transparent bg-transparent"
                }`}
                style={{ height: "44px" }}
              >
                <div className="relative w-full">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search scripts..."
                    className="w-full h-9 px-3 pr-0 text-sm bg-transparent focus:outline-none focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setShowSearch(false);
                        setSearchTerm("");
                      }
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Toggle search visibility */}
              <Button
                onClick={() => {
                  setShowSearch(!showSearch);
                  if (showSearch) setSearchTerm("");
                  else setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                variant="primary"
                size="md"
                icon={Search}
                iconOnly={true}
                className="h-10"
              />
            </div>

            {/* Add Script Button */}
            <Button
              onClick={handleFileSelect}
              variant="primary"
              size="md"
              icon={Plus}
              className="h-10"
            >
              New Script
            </Button>
          </div>

          {/* Centered Header */}
          <div className="flex items-center justify-center mt-15 mb-4">
            <h2 className="text-header text-center">Scripts</h2>
          </div>

          {/* Scrollable Scripts List */}
          <div className="flex-1 overflow-y-auto hide-scrollbar mt-6 flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-fit mx-auto px-4">
              {visibleScripts.map((s, index) => {
                const colorClass = bgColors[index % bgColors.length];
                return (
                  <div key={s.id} className="">
                    <ScriptCard
                      name={s.name}
                      createdAt={s.createdAt}
                      lastPracticed={s.lastPracticed}
                      handleDelete={() => handleDeleteClick(s.id)}
                      handlePractice={() =>
                        router.push(`/practice-room?scriptID=${s.id}`)
                      }
                      bgColor={colorClass}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog {...dialogProps} />

      {/* Upload Modal */}
      <ScriptUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        file={selectedFile}
        onComplete={handleUploadSuccess}
      />
    </DashboardLayout>
  );
}

export default function ScriptsListPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          header="Scripts"
          message="Grabbing your uploads"
          mode="light"
        />
      }
    >
      <ScriptsListContent />
    </Suspense>
  );
}
