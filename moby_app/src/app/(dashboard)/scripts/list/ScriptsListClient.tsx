"use client";

import { useMemo, useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  getAllScripts,
  deleteScript,
  toggleScriptStarred,
  updateScriptName,
} from "@/lib/firebase/client/scripts";
import { useAuthUser } from "@/components/providers/UserProvider";
import ScriptUploadModal from "./uploadModal";
import { CardCarousel } from "./carousel";
import { AnimatedList } from "./animatedList";
import {
  DashboardLayout,
  ScriptCard,
  Button,
  LoadingScreen,
} from "@/components/ui";
import Dialog, { useDialog } from "@/components/ui/Dialog";
import UploadForm from "../upload/uploadFile";
import { Pencil, Plus, RotateCcw, Search, X, Play } from "lucide-react";
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

  // Selected script for left panel display
  const [selectedScript, setSelectedScript] = useState<ScriptData | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [starringItemId, setStarringItemId] = useState<string | null>(null);
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

  const handleEditName = () => {
    if (selectedScript) {
      setEditedName(selectedScript.name);
      setIsEditingName(true);
      setTimeout(() => editInputRef.current?.focus(), 0);
    }
  };

  const handleSaveName = async () => {
    if (!selectedScript || !editedName.trim()) return;

    setIsUpdatingName(true);

    try {
      await updateScriptName(selectedScript.id, editedName.trim());

      showToast({
        header: "Script name updated!",
        type: "success",
      });

      setIsEditingName(false);

      // Update the selected script with the new name
      setSelectedScript({
        ...selectedScript,
        name: editedName.trim(),
      });

      // Invalidate cache to refetch updated list
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
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName("");
  };

  const handleToggleStarred = async (id: string) => {
    setStarringItemId(id);

    try {
      await toggleScriptStarred(id);

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
      setStarringItemId(null);
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

  // Auto-select first item when visibleScripts changes
  useEffect(() => {
    if (visibleScripts.length > 0 && !selectedScript) {
      setSelectedScript(visibleScripts[0]);
    }
  }, [visibleScripts, selectedScript]);

  const starredScriptCards = allScripts
    .filter((s) => s.starred === true)
    .map((s, index) => {
      const colorClass = bgColors[index % bgColors.length];
      return (
        <ScriptCard
          key={s.id}
          name={s.name}
          createdAt={s.createdAt}
          lastPracticed={s.lastPracticed}
          starred={s.starred}
          starringItemId={starringItemId}
          handleDelete={() => handleDeleteClick(s.id)}
          handlePractice={() => router.push(`/practice-room?scriptID=${s.id}`)}
          handleToggleStarred={() => handleToggleStarred(s.id)}
          bgColor={colorClass}
        />
      );
    });

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
      {/* Empty State - Upload Form */}
      {isFetched && allScripts.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <UploadForm onFileUpload={handleFileSelect} />
        </div>
      )}

      {/* Scripts List */}
      {allScripts.length > 0 && (
        <div className="flex flex-col mx-[0%] h-full flex-1">
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
            <h2 className="text-header text-primary-dark text-center">
              Scripts
            </h2>
          </div>

          {/* Starred Scripts */}
          <div className="flex items-center justify-center mb-8">
            <CardCarousel
              cards={starredScriptCards}
              cardsPerPage={3}
              showArrows={true}
              showDots={true}
            />
          </div>

          {/* Two-column section that fills remaining space */}
          <div className="flex-1 flex gap-4 min-h-0">
            {/* Left Section - Selected Script Details */}
            <div className="flex-1 flex flex-col gap-4 min-h-0">
              {/* Selected Script */}
              <div className="flex-1 bg-white/50 rounded-lg p-10 flex items-center justify-center">
                {selectedScript ? (
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1">
                      <h3 className="text-header-3 text-primary-dark">
                        Selected Script
                      </h3>
                      {isEditingName ? (
                        <div className="mb-4">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSaveName();
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="text-2xl font-bold text-black focus:outline-none bg-white p-4 my-2 rounded-[10px] w-[90%]"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              onClick={handleSaveName}
                              variant="primary"
                              size="sm"
                              disabled={isUpdatingName}
                            >
                              {isUpdatingName ? "Saving" : "Save"}
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              variant="primary"
                              size="sm"
                              disabled={isUpdatingName}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-2xl font-bold text-primary-dark-alt">
                            {selectedScript.name}
                          </h3>
                          <Button
                            onClick={handleEditName}
                            variant="primary"
                            size="sm"
                            icon={Pencil}
                            iconOnly={true}
                          />
                        </div>
                      )}
                      <div className="text-gray-400">
                        <p>
                          <span className="font-semibold text-primary-dark-alt">
                            Created:
                          </span>{" "}
                          {selectedScript.createdAt
                            ?.toDate()
                            .toLocaleDateString()}
                        </p>
                        <p>
                          <span className="font-semibold text-primary-dark-alt">
                            Last Practiced:
                          </span>{" "}
                          {selectedScript.lastPracticed
                            ? selectedScript.lastPracticed
                                .toDate()
                                .toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <Button
                        onClick={() =>
                          router.push(
                            `/practice-room?scriptID=${selectedScript.id}`
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
                ) : (
                  <p className="text-gray-500">
                    Select a script to view details
                  </p>
                )}
              </div>

              {/* Most Recently Practiced Script */}
              <div className="flex-1 bg-white/50 rounded-lg p-10 flex items-center justify-center">
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
                    )[0];

                  return recentlyPracticed ? (
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <h3 className="text-header-3 text-primary-dark">
                          Most Recently Practiced
                        </h3>
                        <h3 className="text-2xl font-bold text-primary-dark-alt mb-4">
                          {recentlyPracticed.name}
                        </h3>
                        <div className="text-gray-400">
                          <p>
                            <span className="font-semibold text-primary-dark-alt">
                              Created:
                            </span>{" "}
                            {recentlyPracticed.createdAt
                              ?.toDate()
                              .toLocaleDateString()}
                          </p>
                          <p>
                            <span className="font-semibold text-primary-dark-alt">
                              Last Practiced:
                            </span>{" "}
                            {recentlyPracticed
                              .lastPracticed!.toDate()
                              .toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Button
                          onClick={() =>
                            router.push(
                              `/practice-room?scriptID=${recentlyPracticed.id}`
                            )
                          }
                          variant="primary"
                          size="md"
                          icon={Play}
                        >
                          Again
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-header-3 text-primary-dark">
                      No recently practiced scripts
                    </p>
                  );
                })()}
              </div>
            </div>

            {/* Right Section - AnimatedList */}
            <div className="flex-1 min-h-0">
              <AnimatedList
                items={visibleScripts}
                onItemSelect={(item) => setSelectedScript(item)}
                handleDelete={handleDeleteClick}
                toggleStarred={handleToggleStarred}
                showGradients={true}
                enableArrowNavigation={true}
                displayScrollbar={true}
                savingItemId={starringItemId}
                deletingItemId={deletingItemId}
              />
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
