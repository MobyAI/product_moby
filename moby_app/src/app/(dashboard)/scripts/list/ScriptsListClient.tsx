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

const bgColors = [
  "bg-accent-purple",
  "bg-accent-pink",
  "bg-accent-orange",
  "bg-accent-blue",
];

interface PlaceholderCardProps {
  onClick: () => void;
  disabled?: boolean;
}

function PlaceholderCard({ onClick, disabled }: PlaceholderCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-white/40 rounded-[10px] p-8 w-90 h-60 flex items-center justify-center hover:cursor-pointer hover:bg-white/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Add pinned script"
    >
      <Plus className="w-12 h-12 text-primary-dark" />
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
        setDeletingItemId(id);

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
      const colorClass = bgColors[index % bgColors.length];
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
          bgColor={colorClass}
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
      <div className="flex items-center justify-center mt-10 mb-8">
        <h2 className="text-header text-primary-dark text-center">Scripts</h2>
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
                script with our interactive practice tools and your personalized scene partner.
              </p>
            </div>

            {/* Card 3: Pin Scripts */}
            <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
              <h3 className="text-header-2 text-primary-dark mb-3">
                3. Pin Your Favorites
              </h3>
              <p className="text-primary-dark-alt">
                Pin scripts you're currently practicing or have upcoming
                auditions for to keep them at the top of your collection for
                easy access.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scripts List */}
      {allScripts.length > 0 && (
        <div className="flex flex-col mx-[0%] h-full flex-1">
          {/* Pinned Scripts Carousel */}
          <div className="flex items-center justify-center mb-8">
            <CardCarousel
              cards={pinnedScriptCards}
              cardsPerPage={3}
              showArrows={true}
              showDots={true}
            />
          </div>

          {/* Two-column section that fills remaining space */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Left Section - Selected Script Details */}

            <div className="flex-[0_0_50%] flex flex-col gap-4 min-h-0">
              <div className="flex-1 bg-white/40 rounded-lg p-5 flex flex-col min-h-0">
                <h3 className="text-header-3 text-primary-dark mb-2">
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

            {/* Right Section - Collection */}
            <div className="flex-[0_0_50%] flex flex-col gap-4 min-h-0">
              {/* Most Recently Practiced Scripts */}
              <div className="flex-1 bg-white/40 rounded-lg p-5 flex flex-col gap-4 overflow-y-auto">
                <h3 className="text-header-3 text-primary-dark">
                  Recently Practiced
                </h3>
                {(() => {
                  const recentlyPracticed = allScripts
                    .filter(
                      (s) =>
                        s.lastPracticed !== null &&
                        s.lastPracticed !== undefined
                    )
                    .sort(
                      (a, b) =>
                        b.lastPracticed!.toDate().getTime() -
                        a.lastPracticed!.toDate().getTime()
                    )
                    .slice(0, 3);

                  return recentlyPracticed.length > 0 ? (
                    recentlyPracticed.map((script) => (
                      <div
                        key={script.id}
                        className="bg-primary-light-alt rounded-lg p-6 flex items-center justify-between"
                      >
                        <div>
                          <h4 className="text-xl font-bold text-primary-dark-alt mb-2">
                            {script.name}
                          </h4>
                          <div className="text-gray-400 text-sm">
                            <p>
                              <span className="font-semibold text-primary-dark-alt">
                                Uploaded:
                              </span>{" "}
                              {script.createdAt?.toDate().toLocaleDateString()}
                            </p>
                            <p>
                              <span className="font-semibold text-primary-dark-alt">
                                Last Practiced:
                              </span>{" "}
                              {script
                                .lastPracticed!.toDate()
                                .toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div>
                          <Button
                            onClick={() =>
                              router.push(
                                `/practice-room?scriptID=${script.id}`
                              )
                            }
                            variant="primary"
                            size="md"
                            icon={Play}
                          >
                            Practice
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <h3 className="text-header-3 text-primary-dark">
                        No recently practiced scripts
                      </h3>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* <div className="flex-1 overflow-y-auto hide-scrollbar mt-6 flex justify-center">
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
          </div> */}
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
