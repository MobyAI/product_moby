"use client";

import { useMemo, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  getAllScripts,
  deleteScript,
  toggleScriptPinned,
  updateScriptName,
} from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import ScriptUploadModal from "./uploadModal";
import { CardCarousel } from "./cardCarousel";
import { AnimatedList } from "./animatedList";
import { ScriptSelectorModal } from "./scriptSelectorModal";
import {
  DashboardLayout,
  ScriptCard,
  Button,
  LoadingScreen,
} from "@/components/ui";
import Dialog, { useDialog } from "@/components/ui/Dialog";
import EditDialog, { useEditDialog } from "./editDialog";
import {
  Plus,
  RotateCcw,
  Search,
  X,
  Play,
  Sparkles,
  Pin,
  Calendar,
  Clock,
} from "lucide-react";
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

interface PlaceholderCardProps {
  onClick: () => void;
  disabled?: boolean;
}

function PlaceholderCard({ onClick, disabled }: PlaceholderCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-white/40 text-gray-300 rounded-[10px] p-8 w-85 h-55 2xl:w-90 flex items-center justify-center hover:cursor-pointer hover:bg-white/80 hover:text-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Add pinned script"
    >
      <Pin className="w-10 h-10" />
    </button>
  );
}

function ScriptsListContent() {
  const { uid } = useAuthUser();
  const userID = uid;
  const router = useRouter();
  const { showToast } = useToast();
  const { dialogProps, openConfirm } = useDialog();
  const { editDialogProps, openEditDialog } = useEditDialog();

  // Script upload modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Script selector modal
  const [isSelectorModalOpen, setIsSelectorModalOpen] = useState(false);

  // File upload drag-and-drop modal
  const [isFileUploadModalOpen, setIsFileUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [isPinning, setIsPinning] = useState(false);
  const [pinnedItemId, setPinnedItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

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
    setIsFileUploadModalOpen(true);
  };

  const handleFileFromModal = (file: File) => {
    const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB

    if (file.size > MAX_FILE_SIZE) {
      showToast({
        header: "File too large",
        line1: `Maximum file size is ${
          MAX_FILE_SIZE / (1024 * 1024)
        }MB. Your file is ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        type: "danger",
        alignment: "center",
      });
      return;
    }

    setSelectedFile(file);
    setIsFileUploadModalOpen(false);
    setIsModalOpen(true);
  };

  const handleBrowseFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx";

    input.onchange = (e: Event) => {
      if (!e.target) return;
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        handleFileFromModal(file);
      }
    };
    input.click();
  };

  const handleDeleteClick = (id: string) => {
    openConfirm(
      "Delete Script",
      "Are you sure you want to delete this script? This action cannot be undone.",
      async () => {
        setDeletingItemId(id);

        try {
          await deleteScript(id);

          showToast({
            header: "Script deleted!",
            type: "success",
            alignment: "center",
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
            alignment: "center",
          });
        } finally {
          setDeletingItemId(null);
        }
      },
      { type: "delete" }
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditName = (item: any) => {
    openEditDialog({
      title: "Edit Script Name",
      initialValue: item?.name || "",
      placeholder: "Enter script name...",
      onSave: (newName: string) => handleSaveName(newName, item),
    });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSaveName = async (newName: string, script: any) => {
    if (!script) return;

    try {
      await updateScriptName(script.id, newName);

      showToast({
        header: "Script name updated!",
        type: "success",
        alignment: "center",
      });

      await queryClient.invalidateQueries({
        queryKey: ["scripts", userID],
      });
    } catch (err) {
      console.error("Failed to update script name:", err);
      Sentry.captureException(err);
      showToast({
        header: "Failed to update script name",
        line1: "Please try again",
        type: "danger",
        alignment: "center",
      });
      throw err;
    }
  };

  const handleTogglePinned = async (id: string) => {
    setIsPinning(true);
    setPinnedItemId(id);

    try {
      await toggleScriptPinned(id);

      // Invalidate cache to refetch updated list
      await queryClient.invalidateQueries({
        queryKey: ["scripts", userID],
      });
    } catch (err) {
      console.error("Failed to toggle starred:", err);
      Sentry.captureException(err);
      showToast({
        header: "Failed to update script",
        line1: "Please try again",
        type: "danger",
        alignment: "center",
      });
    } finally {
      setIsPinning(false);
      setPinnedItemId(null);
    }
  };

  const handleUploadSuccess = async () => {
    setSelectedFile(null);

    showToast({
      header: "New script uploaded!",
      type: "success",
      alignment: "center",
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

  const unpinnedScripts = useMemo(
    () => allScripts.filter((s) => s.pinned != true),
    [allScripts]
  );

  const pinnedScriptCards = useMemo(() => {
    const pinnedScripts = allScripts.filter((s) => s.pinned === true);

    const cards = pinnedScripts.map((s, index) => {
      const additionalStyles = "bg-[#E1DDCF] rounded-[30px]";
      return (
        <ScriptCard
          key={s.id}
          name={s.name}
          createdAt={s.createdAt}
          lastPracticed={s.lastPracticed}
          pinned={s.pinned}
          pinnedItemId={pinnedItemId}
          handleDelete={() => handleDeleteClick(s.id)}
          handlePractice={() => router.push(`/practice-room?scriptID=${s.id}`)}
          handleTogglePinned={() => handleTogglePinned(s.id)}
          handleEdit={() => handleEditName(s)}
          classNames={additionalStyles}
        />
      );
    });

    // Add placeholder cards if we have fewer than 3 pinned scripts
    const placeholdersNeeded = Math.max(0, 3 - pinnedScripts.length);

    for (let i = 0; i < placeholdersNeeded; i++) {
      cards.push(
        <PlaceholderCard
          key={`placeholder-${i}`}
          onClick={() => setIsSelectorModalOpen(true)}
          disabled={pinnedItemId !== null}
        />
      );
    }

    return cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allScripts, pinnedItemId, router]);

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
    <DashboardLayout maxWidth={95}>
      {/* Header Section */}
      <div className="flex items-center justify-between px-4">
        {/* Left spacer for balance */}
        <div className="flex-1"></div>

        {/* Centered Header */}
        <h2 className="text-header text-primary-dark text-center">Scripts</h2>

        {/* Right-side controls (search + add button) */}
        <div className="flex-1 flex items-center justify-end gap-2">
          {/* Search bar */}
          <div className="flex items-center">
            <div
              className={`flex items-center transition-all duration-300 ease-in-out border rounded-full mr-2 h-12 overflow-hidden ${
                showSearch
                  ? "w-60 sm:w-90 border-gray-300 bg-white"
                  : "w-0 border-transparent bg-transparent"
              }`}
            >
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search scripts"
                  className={`
              w-full h-9 px-4 pr-0 text-md bg-transparent
              focus:outline-none focus:ring-0
            `}
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

            <Button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchTerm("");
                else setTimeout(() => searchInputRef.current?.focus(), 100);
              }}
              variant="primary"
              size="lg"
              icon={Search}
              iconOnly={true}
              className="h-12 w-12"
              title="Search Scripts"
            />
          </div>

          {/* Add Script Button */}
          <Button
            onClick={handleFileSelect}
            variant="secondary"
            size="lg"
            icon={Plus}
            iconOnly={true}
            className="h-12 w-12"
            title="Upload Script"
          />
        </div>
      </div>

      {/* Empty State - Upload Form */}
      {isFetched && allScripts.length === 0 && (
        <div className="flex-1 flex items-start justify-center pt-6">
          <div className="w-full max-w-2xl space-y-10">
            {/* Card 1: Upload */}
            <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
              <h3 className="text-header-2 text-primary-dark mb-3">
                1. Upload Your First Script
              </h3>
              <p className="text-primary-dark-alt mb-6">
                Get started by uploading a script to begin your rehearsal
                journey.
              </p>
              <Button
                onClick={handleFileSelect}
                variant="primary"
                size="md"
                icon={Sparkles}
              >
                Click Here To Get Started!
              </Button>
            </div>

            {/* Card 2: Rehearse */}
            <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
              <h3 className="text-header-2 text-primary-dark mb-3">
                2. Start Rehearsing
              </h3>
              <p className="text-primary-dark-alt">
                Once uploaded, press the play button to begin rehearsing your
                script with our interactive practice tools and your personalized
                scene partner.
              </p>
            </div>

            {/* Card 3: Pin Scripts */}
            <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
              <h3 className="text-header-2 text-primary-dark mb-3">
                3. Pin Your Favorites
              </h3>
              <p className="text-primary-dark-alt">
                {`Pin scripts you're currently practicing or have upcoming
                auditions for to keep them at the top of your collection for
                easy access.`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scripts List */}
      {allScripts.length > 0 && (
        <div className="flex flex-col mx-[0%] pt-8 h-full flex-1 overflow-hidden">
          {/* Pinned Scripts Carousel */}
          <div className="flex items-center justify-center mb-8 flex-shrink-0">
            <CardCarousel
              cards={pinnedScriptCards}
              cardsPerPage={3}
              showArrows={true}
              showDots={true}
            />
          </div>

          {/* Single column section that fills remaining space */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Collection - Centered with max width */}
            <div className="flex-1 flex flex-col gap-4 min-h-0 max-w-2xl mx-auto w-full">
              <div className="flex-1 bg-primary-accent rounded-[30px] py-8 px-13 flex flex-col min-h-0">
                <h3 className="text-header-2 text-primary-light-alt mb-4">
                  Your Collection
                </h3>
                <div className="flex-1 min-h-0">
                  <AnimatedList
                    items={visibleScripts}
                    handleDelete={handleDeleteClick}
                    togglePinned={handleTogglePinned}
                    handleEdit={handleEditName}
                    showGradients={false}
                    enableArrowNavigation={true}
                    displayScrollbar={true}
                    savingItemId={pinnedItemId}
                    deletingItemId={deletingItemId}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog {...dialogProps} />

      {/* Edit Modal */}
      <EditDialog {...editDialogProps} />

      {/* Upload Modal */}
      <ScriptUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        file={selectedFile}
        onComplete={handleUploadSuccess}
      />

      {/* Script Selector Modal */}
      <ScriptSelectorModal
        isOpen={isSelectorModalOpen}
        onClose={() => setIsSelectorModalOpen(false)}
        unpinnedScripts={unpinnedScripts}
        onSelect={handleTogglePinned}
        isPinning={isPinning}
      />

      {/* File Upload Drag & Drop Modal */}
      {isFileUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="upload-dialog-title"
        >
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsFileUploadModalOpen(false)}
          />

          {/* Dialog panel */}
          <div className="relative z-10 transform overflow-hidden rounded-xl bg-primary-light-alt p-6 text-left max-w-md w-full transition-all animate-fadeIn">
            {/* Close button */}
            <div className="absolute right-5 top-5 z-10">
              <button
                type="button"
                className="rounded-md bg-transparent text-gray-500 hover:opacity-90 hover:cursor-pointer focus:outline-none transition-colors"
                onClick={() => setIsFileUploadModalOpen(false)}
              >
                <span className="sr-only">Close</span>
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="relative">
              <div className="flex items-start">
                <div className="text-left w-full">
                  <h3
                    id="upload-dialog-title"
                    className="text-header-2 text-primary-dark"
                  >
                    Upload Script
                  </h3>
                  <div className="mt-5">
                    {/* Drag and Drop Area */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (
                          file &&
                          (file.name.endsWith(".pdf") ||
                            file.name.endsWith(".docx"))
                        ) {
                          handleFileFromModal(file);
                        } else {
                          showToast({
                            header: "Invalid file type",
                            line1: "Please upload a PDF or DOCX file",
                            type: "danger",
                            alignment: "center",
                          });
                        }
                      }}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        isDragging
                          ? "border-primary-dark bg-primary-light"
                          : "border-gray-300 hover:border-primary-dark"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Plus className="w-13 h-13 text-gray-500" />
                        <p className="text-md text-gray-500 font-medium mb-1">
                          Drag and drop file here or
                        </p>
                        <button
                          type="button"
                          onClick={handleBrowseFile}
                          className="inline-flex justify-center rounded-full bg-primary-dark px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:cursor-pointer hover:opacity-90 transition-colors"
                        >
                          Browse Files
                        </button>
                        <p className="text-xs text-gray-500">
                          PDF or DOCX • Max 3MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
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
