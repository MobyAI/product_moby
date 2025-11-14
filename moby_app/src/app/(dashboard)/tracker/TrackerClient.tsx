"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  ReactElement,
  useCallback,
  Suspense,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Calendar,
  Film,
  Tv,
  Video,
  Megaphone,
  Theater,
  Filter,
  Search,
  X,
  Plus,
  Sparkles,
  Star,
  UserRoundPlus,
  UsersRound,
  Mic,
  EllipsisVertical,
  Pencil,
  Trash,
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type {
  AuditionData,
  ProjectTypeFilter,
  StatusFilter,
  AuditionsData,
} from "@/types/audition";
import {
  addAudition,
  getAllAuditions,
  updateAudition,
  deleteAudition,
} from "@/lib/firebase/client/auditions";
import { toBasicError } from "@/types/error";
import { LoadingScreen, Button, DashboardLayout } from "@/components/ui";
import AuditionModal from "@/components/auditions/AuditionModal";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";
import Dialog, { useDialog } from "@/components/ui/Dialog";
import { motion, AnimatePresence } from "motion/react";

// Sort configuration type
interface SortConfig {
  key: keyof AuditionsData;
  direction: "asc" | "desc";
}

function TrackerPageContent() {
  // State Management
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "date",
    direction: "desc",
  });
  const [filterType, setFilterType] = useState<ProjectTypeFilter>("all");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [showTypeFilter, setShowTypeFilter] = useState<boolean>(false);
  const [showStatusFilter, setShowStatusFilter] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [formData, setFormData] = useState({
    date: "",
    projectTitle: "",
    castingDirector: "",
    auditionType: "",
    auditionRole: "",
    billing: "",
    source: "",
    status: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Refs
  const typeFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef(null);
  const parentRef = useRef(null);

  // Toast Message
  const { showToast } = useToast();

  // Confirm Dialog
  const { dialogProps, openConfirm } = useDialog();

  // TanStack Query for data fetching
  const queryClient = useQueryClient();
  const {
    data: auditionsData = [],
    isLoading: loading,
    error,
    // refetch: loadAuditions
  } = useQuery({
    queryKey: ["auditions"],
    queryFn: getAllAuditions,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  useEffect(() => {
    if (error) {
      const err = toBasicError(error);
      console.error("User auditions fetch failed:", err);
    }
  }, [error]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        typeFilterRef.current &&
        !typeFilterRef.current.contains(event.target as Node)
      ) {
        setShowTypeFilter(false);
      }
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target as Node)
      ) {
        setShowStatusFilter(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDelete = async (id: string) => {
    openConfirm(
      "Delete Audition",
      "Are you sure? This action cannot be undone.",
      async () => {
        setIsDeleting(true);

        try {
          await deleteAudition(id);

          showToast({
            header: "Audition deleted!",
            type: "success",
          });

          // Invalidate cache to refetch updated list
          await queryClient.invalidateQueries({
            queryKey: ["auditions"],
          });
        } catch (err) {
          console.error("Failed to delete audition:", err);
          Sentry.captureException(err);
          showToast({
            header: "Failed to delete",
            line1: "Please try again",
            type: "danger",
          });
        } finally {
          setIsDeleting(false);
        }
      },
      { type: "delete" }
    );
  };

  const handleRefresh = useCallback(async () => {
    console.log("Refreshing auditions data...");
    // await loadAuditions();

    // Refresh using tanstack react query
    await queryClient.invalidateQueries({ queryKey: ["auditions"] });
    await queryClient.invalidateQueries({ queryKey: ["auditionStats"] });
  }, [queryClient]);

  // Project type config
  const projectTypeConfig: Record<
    string,
    { label: string; icon: ReactElement }
  > = {
    tv: { label: "TV", icon: <Tv className="w-4 h-4" /> },
    film: { label: "Film", icon: <Film className="w-4 h-4" /> },
    commercial: {
      label: "Commercial",
      icon: <Megaphone className="w-4 h-4" />,
    },
    theater: { label: "Theater", icon: <Theater className="w-4 h-4" /> },
    voiceover: { label: "Voiceover", icon: <Mic className="w-4 h-4" /> },
    other: { label: "Other", icon: <Video className="w-4 h-4" /> },
  };

  const getProjectIcon = (type: string) => {
    return projectTypeConfig[type]?.icon || <Video className="w-4 h-4" />;
  };

  // Billing type config
  const billingConfig: Record<string, { label: string; icon: ReactElement }> = {
    star: { label: "Star", icon: <Star className="w-4 h-4" /> },
    "co-star": {
      label: "Co-Star",
      icon: <UserRoundPlus className="w-4 h-4" />,
    },
    extra: {
      label: "Extra",
      icon: <UsersRound className="w-4 h-4" />,
    },
    other: { label: "Other", icon: <Video className="w-4 h-4" /> },
  };

  const getBillingIcon = (type: string) => {
    return billingConfig[type]?.icon || <Video className="w-4 h-4" />;
  };

  // Status type config
  const statusConfig: Record<
    string,
    { label: string; bgColor: string; textColor: string; borderColor: string }
  > = {
    completed: {
      label: "Completed",
      bgColor: "bg-purple-100",
      textColor: "text-purple-800",
      borderColor: "border border-purple-800",
    },
    declined: {
      label: "Declined",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
      borderColor: "border border-red-800",
    },
    callback: {
      label: "Callback",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
      borderColor: "border border-blue-800",
    },
    hold: {
      label: "Hold",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      borderColor: "border border-yellow-800",
    },
    booked: {
      label: "Booked",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
      borderColor: "border border-green-800",
    },
  };

  const getStatusStyle = (status: string) => {
    const config = statusConfig[status];
    return config
      ? `${config.bgColor} ${config.textColor} ${config.borderColor}`
      : "bg-gray-100 text-gray-800";
  };

  // Sorting function
  const handleSort = (key: keyof AuditionsData): void => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const filteredAndSortedAuditions = useMemo(() => {
    return auditionsData
      .filter((audition) => {
        const typeMatch =
          filterType === "all" || audition.auditionType === filterType;
        const statusMatch =
          filterStatus === "all" || audition.status === filterStatus;

        // Search filter
        const searchMatch =
          searchTerm === "" ||
          audition.projectTitle
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          audition.auditionRole
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          audition.castingDirector
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          audition.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
          audition.auditionType
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          audition.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
          audition.billing.toLowerCase().includes(searchTerm.toLowerCase());

        return typeMatch && statusMatch && searchMatch;
      })
      .sort((a, b) => {
        if (sortConfig.key) {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];
          if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
  }, [auditionsData, filterType, filterStatus, searchTerm, sortConfig]);

  // Virtual scrolling setup
  const virtualizer = useVirtualizer({
    count: filteredAndSortedAuditions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5, // Number of items to render outside of view
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openModalWithData = (auditionData: any) => {
    flushSync(() => {
      setFormData({
        date: auditionData.date,
        projectTitle: auditionData.projectTitle || "",
        auditionType: auditionData.auditionType || "",
        castingDirector: auditionData.castingDirector || "",
        auditionRole: auditionData.auditionRole || "",
        source: auditionData.source || "",
        billing: auditionData.billing || "",
        status: auditionData.status || "",
      });
      setIsEditing(true);
      setEditingId(auditionData.id);
      setIsModalOpen(true);
    });
  };

  const resetForm = () => {
    setFormData({
      date: "",
      projectTitle: "",
      castingDirector: "",
      auditionType: "",
      auditionRole: "",
      billing: "",
      source: "",
      status: "",
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    document.body.style.overflow = "auto";
    resetForm();
    setIsEditing(false);
    setEditingId(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditing && editingId) {
        await updateAudition(editingId, formData);

        showToast({
          header: "Audition updated!",
          type: "success",
        });
      } else {
        if (
          !formData.projectTitle ||
          !formData.auditionRole ||
          !formData.auditionType ||
          !formData.date
        ) {
          showToast({
            header: "Missing fields detected",
            line1: "Please fill in required fields and try again",
            type: "warning",
          });

          setIsSubmitting(false);
          return;
        }

        await addAudition(formData);

        showToast({
          header: "New audition added!",
          type: "success",
        });
      }

      // Close modal after everything succeeds
      await handleRefresh();
      closeModal();
    } catch (error) {
      console.error("Error saving audition:", error);
      Sentry.captureException(error);
      showToast({
        header: "An error occurred",
        line1: "Please try again",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const auditionTypes = {
    tv: { label: "TV", icon: <Tv className="w-4 h-4" /> },
    film: { label: "Film", icon: <Film className="w-4 h-4" /> },
    commercial: {
      label: "Commercial",
      icon: <Megaphone className="w-4 h-4" />,
    },
    theater: { label: "Theater", icon: <Theater className="w-4 h-4" /> },
    voiceover: { label: "Voiceover", icon: <Mic className="w-4 h-4" /> },
    other: { label: "Other", icon: <Video className="w-4 h-4" /> },
  };

  const billingTypes = {
    star: { label: "Star", icon: <Star className="w-4 h-4" /> },
    "co-star": {
      label: "Co-Star",
      icon: <UserRoundPlus className="w-4 h-4" />,
    },
    extra: {
      label: "Extra",
      icon: <UsersRound className="w-4 h-4" />,
    },
    other: { label: "Other", icon: <Video className="w-4 h-4" /> },
  };

  // Mobile view card - Improved
  function AuditionCard({
    audition,
    onEdit,
    onDelete,
    openMenuId,
    setOpenMenuId,
    isDeleting,
  }: {
    audition: AuditionsData;
    onEdit: () => void;
    onDelete: () => void;
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    isDeleting: boolean;
  }) {
    return (
      <div className="bg-white/50 rounded-2xl p-8 mb-4 shadow-md">
        {/* Header: Date & Actions */}
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 text-gray-600 rounded-lg text-sm font-medium">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(audition.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>

          {/* Action Menu - Always visible on mobile */}
          <AnimatePresence mode="wait">
            {openMenuId === audition.id ? (
              <motion.div
                key="menu-open"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1 bg-black/5 rounded-xl p-1"
              >
                <button
                  onClick={onEdit}
                  className="p-2.5 rounded-lg hover:bg-white active:scale-95 text-gray-700 transition-all duration-200"
                  aria-label="Edit audition"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  disabled={isDeleting}
                  onClick={onDelete}
                  className="p-2.5 rounded-lg hover:bg-red-50 active:scale-95 text-red-600 transition-all duration-200 disabled:opacity-50"
                  aria-label="Delete audition"
                >
                  <Trash className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpenMenuId(null)}
                  className="p-2.5 rounded-lg hover:bg-white active:scale-95 text-gray-500 transition-all duration-200"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                key="menu-button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setOpenMenuId(audition.id)}
                className="p-2.5 rounded-lg hover:bg-gray-100 active:scale-95 text-gray-400 transition-all duration-200"
                aria-label="Open menu"
              >
                <EllipsisVertical className="w-5 h-5" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Project Title - Hero Element */}
        <h3 className="font-bold text-2xl text-gray-900 mb-3 line-clamp-2 leading-tight">
          {audition.projectTitle}
        </h3>

        {/* Status Badge - Prominent placement */}
        <div className="mb-4">
          <span
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 capitalize ${getStatusStyle(
              audition.status
            )}`}
          >
            {audition.status || "No Status"}
          </span>
        </div>

        {/* Type and Billing Row */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 text-gray-700 rounded-lg text-sm font-medium capitalize">
            {getProjectIcon(audition.auditionType)}
            <span>{audition.auditionType}</span>
          </div>
          {audition.billing && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/5 text-gray-700 rounded-lg text-sm font-medium capitalize">
              {getBillingIcon(audition.billing)}
              <span>{audition.billing}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        {(audition.auditionRole ||
          audition.castingDirector ||
          audition.source) && <div className="border-t border-gray-100 my-4" />}

        {/* Details Section - Cleaner layout */}
        <div className="space-y-3 text-sm">
          {audition.auditionRole && (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">
                Role
              </span>
              <span className="text-gray-900">{audition.auditionRole}</span>
            </div>
          )}
          {audition.castingDirector && (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">
                Casting Director
              </span>
              <span className="text-gray-900">{audition.castingDirector}</span>
            </div>
          )}
          {audition.source && (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-500 text-xs uppercase tracking-wide">
                Source
              </span>
              <span className="text-gray-900">{audition.source}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <LoadingScreen
        header="Audition Tracker"
        message="Loading your audition history"
        mode="light"
      />
    );
  }

  return (
    <DashboardLayout maxWidth={95}>
      <div className="flex flex-col mx-[0%] min-h-0 flex-1">
        {/* Header Section */}
        <div className="flex items-center justify-end md:justify-between px-2 pb-3">
          {/* Left-aligned Header */}
          <h2 className="hidden md:inline text-header-2 text-primary-dark">
            Auditions
          </h2>

          {/* Right-side controls (search + add button) */}
          <div className="flex items-center justify-end gap-2 flex-1">
            {/* Search bar */}
            <div className="flex items-center max-w-xl w-full md:ml-6">
              <div className="flex items-center transition-all duration-300 ease-in-out border rounded-full h-11 sm:h-13 overflow-hidden w-full border-gray-300 bg-white">
                <div className="relative w-full flex items-center">
                  <Search className="w-5 h-5 absolute left-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search auditions"
                    className="w-full h-9 pl-11 pr-8 text-md sm:text-lg bg-transparent focus:outline-none focus:ring-0"
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        setSearchTerm("");
                      }
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Add Button */}
            <Button
              onClick={() => setIsModalOpen(true)}
              variant="secondary"
              size="xl"
              icon={Plus}
              iconOnly={true}
              className="h-11 w-11 sm:h-13 sm:w-13 flex-shrink-0"
              title="Add Audition"
            />
          </div>
        </div>

        {auditionsData.length === 0 && (
          <>
            <div className="flex-1 flex items-start justify-center pt-6">
              <div className="w-full max-w-2xl space-y-10">
                {/* Card 1: Add */}
                <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
                  <h3 className="text-header-2 text-primary-dark mb-3">
                    1. Add New Audition
                  </h3>
                  <p className="text-primary-dark-alt">
                    Start tracking your auditions by adding your first entry.
                  </p>
                  <p className="text-primary-dark-alt mb-6">
                    Record important details and keep everything organized in
                    one place.
                  </p>
                  <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="primary"
                    size="md"
                    icon={Sparkles}
                  >
                    Click Here To Get Started!
                  </Button>
                </div>

                {/* Card 2: View & Organize */}
                <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
                  <h3 className="text-header-2 text-primary-dark mb-3">
                    2. View & Organize
                  </h3>
                  <p className="text-primary-dark-alt">
                    All your auditions are displayed in an easy-to-read table.
                    Use the filter options to narrow down by type or status,
                    sort by date or project, and quickly search to find exactly
                    what you need.
                  </p>
                </div>

                {/* Card 3: Track Progress */}
                <div className="bg-white/50 rounded-lg p-10 flex flex-col items-center text-center">
                  <h3 className="text-header-2 text-primary-dark mb-3">
                    3. Track Your Progress
                  </h3>
                  <p className="text-primary-dark-alt">
                    Click any audition to view full details and update its
                    status as you move through the process—from submitted to
                    booked! Stay on top of every opportunity and never miss a
                    follow-up.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {auditionsData.length > 0 && (
          <>
            {/* Left-side: Active Filters */}
            {filterType !== "all" || filterStatus !== "all" || searchTerm ? (
              <div className="flex items-center gap-2 text-sm">
                {filterType !== "all" && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary-light text-primary-dark">
                    Type: {filterType}
                    <button
                      onClick={() => setFilterType("all")}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {filterStatus !== "all" && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary-light text-primary-dark">
                    Status: {filterStatus}
                    <button
                      onClick={() => setFilterStatus("all")}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
                {searchTerm && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-md bg-primary-light text-primary-dark">
                    {`Search: "${searchTerm}"`}
                    <button
                      onClick={() => setSearchTerm("")}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )}
              </div>
            ) : null}

            {/* Main Content: Audition Table */}
            <div className="flex-1 flex flex-col bg-transparent mt-3 min-h-0">
              {/* Scrollable Container for Header + Body */}
              <div className="hidden sm:block overflow-x-auto hide-scrollbar flex-1 min-h-0">
                <div className="min-w-[1024px] h-full flex flex-col">
                  {/* Fixed Table Header */}
                  <div className="sticky top-0 z-10 bg-[#E1DDCF] rounded-md">
                    <div className="flex pl-8 pr-8 py-6 text-left text-[13px] font-semibold text-primary-dark uppercase tracking-wider">
                      <div
                        onClick={() => handleSort("date")}
                        className="flex-1 w-32 flex items-center gap-1 cursor-pointer hover:text-gray-700"
                      >
                        Date
                        {sortConfig.key === "date" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                      <div
                        onClick={() => handleSort("projectTitle")}
                        className="flex-1 flex items-center gap-1 cursor-pointer hover:text-gray-700"
                      >
                        Project
                        {sortConfig.key === "projectTitle" &&
                          (sortConfig.direction === "asc" ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          ))}
                      </div>
                      <div className="flex-1">
                        <div
                          ref={typeFilterRef}
                          className="relative inline-block"
                        >
                          <button
                            onClick={() => setShowTypeFilter(!showTypeFilter)}
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          >
                            TYPE
                            <Filter
                              className={`w-3 h-3 ${
                                filterType !== "all" ? "text-blue-600" : ""
                              }`}
                            />
                          </button>

                          {showTypeFilter && (
                            <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-[60] min-w-[120px]">
                              <button
                                onClick={() => {
                                  setFilterType("all");
                                  setShowTypeFilter(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                  filterType === "all"
                                    ? "bg-gray-100 font-medium"
                                    : ""
                                }`}
                              >
                                All
                              </button>
                              {Object.entries(projectTypeConfig).map(
                                ([type, config]) => (
                                  <button
                                    key={type}
                                    onClick={() => {
                                      setFilterType(
                                        type as AuditionData["projectType"]
                                      );
                                      setShowTypeFilter(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
                                      filterType === type
                                        ? "bg-gray-100 font-medium"
                                        : ""
                                    }`}
                                  >
                                    {config.icon}
                                    {config.label}
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-1">Casting</div>
                      <div className="flex-1">Role</div>
                      <div className="flex-1">Source</div>
                      <div className="flex-1 w-32">Billing</div>
                      <div className="flex-1 w-32">
                        <div
                          ref={statusFilterRef}
                          className="relative inline-block"
                        >
                          <button
                            onClick={() =>
                              setShowStatusFilter(!showStatusFilter)
                            }
                            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                          >
                            STATUS
                            <Filter
                              className={`w-3 h-3 ${
                                filterStatus !== "all" ? "text-blue-600" : ""
                              }`}
                            />
                          </button>

                          {showStatusFilter && (
                            <div className="absolute top-full right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-[60] min-w-[120px]">
                              <button
                                onClick={() => {
                                  setFilterStatus("all");
                                  setShowStatusFilter(false);
                                }}
                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                  filterStatus === "all"
                                    ? "bg-gray-100 font-medium"
                                    : ""
                                }`}
                              >
                                All
                              </button>
                              {Object.entries(statusConfig).map(
                                ([status, config]) => (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      setFilterStatus(
                                        status as AuditionData["status"]
                                      );
                                      setShowStatusFilter(false);
                                    }}
                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                                      filterStatus === status
                                        ? "bg-gray-100 font-medium"
                                        : ""
                                    }`}
                                  >
                                    <span
                                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.textColor} capitalize`}
                                    >
                                      {config.label}
                                    </span>
                                  </button>
                                )
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Actions column header - matches body width */}
                      <div className="flex-none w-[36px]"></div>
                    </div>
                  </div>

                  {/* Scrollable Table Body */}
                  <div ref={parentRef} className="flex-1 overflow-auto min-h-0">
                    <div
                      style={{
                        height: `${virtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      {filteredAndSortedAuditions.length === 0 ? (
                        <div className="flex justify-center items-center h-32 text-gray-500">
                          No auditions found
                        </div>
                      ) : (
                        virtualizer.getVirtualItems().map((virtualRow) => {
                          const audition =
                            filteredAndSortedAuditions[virtualRow.index];

                          return (
                            <div
                              key={virtualRow.key}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                              }}
                            >
                              <div className="flex items-center pl-8 pr-8 py-4 border-b border-gray-300 hover:bg-black/5 transition-colors text-sm h-15 group">
                                <motion.div
                                  className="flex items-center flex-1 min-w-0"
                                  // onClick={() => openModalWithData(audition)}
                                  animate={{
                                    x: openMenuId === audition.id ? -8 : 0,
                                  }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30,
                                  }}
                                >
                                  {/* All your existing content columns */}
                                  <div className="flex-1 w-32 flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4 text-gray-500" />
                                    {new Date(audition.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      }
                                    )}
                                  </div>
                                  <div className="flex-1 font-medium text-primary-dark truncate min-w-0">
                                    {audition.projectTitle}
                                  </div>
                                  <div className="flex-1 flex items-center gap-2 text-primary-dark capitalize min-w-0">
                                    {getProjectIcon(audition.auditionType)}
                                    <span>
                                      {audition.auditionType === "tv"
                                        ? "TV"
                                        : audition.auditionType}
                                    </span>
                                  </div>
                                  <div className="flex-1 flex items-center gap-2 text-primary-dark capitalize truncate min-w-0">
                                    {audition.castingDirector || "-"}
                                  </div>
                                  <div className="flex-1 text-primary-dark truncate min-w-0">
                                    {audition.auditionRole || "-"}
                                  </div>
                                  <div className="flex-1 text-primary-dark truncate min-w-0">
                                    {audition.source || "-"}
                                  </div>
                                  <div className="flex-1 w-32 flex items-center gap-2 text-primary-dark capitalize">
                                    {audition.billing &&
                                      getBillingIcon(audition.billing)}
                                    <span>{audition.billing || "-"}</span>
                                  </div>
                                  <div className="flex-1 w-32 capitalize">
                                    <span
                                      className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium ${
                                        audition.status &&
                                        getStatusStyle(audition.status)
                                      }`}
                                    >
                                      {audition.status || "-"}
                                    </span>
                                  </div>
                                </motion.div>

                                {/* Actions Column - Modified to expand inline */}
                                <div className="flex-none flex items-center justify-end overflow-hidden">
                                  {/* Sliding Menu Container with variable width */}
                                  <div
                                    className={`flex items-center transition-all duration-300 ease-out origin-right ${
                                      openMenuId === audition.id
                                        ? "max-w-[300px] scale-x-100 opacity-100 mr-2"
                                        : "max-w-0 scale-x-0 opacity-0"
                                    }`}
                                    style={{
                                      pointerEvents:
                                        openMenuId === audition.id
                                          ? "auto"
                                          : "none",
                                    }}
                                  >
                                    <AnimatePresence mode="wait">
                                      {openMenuId === audition.id && (
                                        <motion.div
                                          key="menu-open"
                                          className="flex items-center gap-1"
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          exit={{ opacity: 0, x: 20 }}
                                          transition={{ duration: 0.15 }}
                                        >
                                          <motion.button
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0 }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openModalWithData(audition);
                                              setOpenMenuId(null);
                                            }}
                                            className="p-3 rounded-full hover:bg-white/50 hover:cursor-pointer flex items-center gap-2 text-gray-700"
                                            aria-label="Edit"
                                          >
                                            <Pencil className="w-4 h-4" />
                                          </motion.button>
                                          <motion.button
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.02 }}
                                            disabled={isDeleting}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDelete(audition.id);
                                            }}
                                            className="p-3 rounded-full hover:bg-red-50 hover:cursor-pointer flex items-center gap-2 text-red-600"
                                            aria-label="Delete"
                                          >
                                            <Trash className="w-4 h-4" />
                                          </motion.button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>

                                  {/* Ellipsis Button */}
                                  <AnimatePresence mode="wait">
                                    {openMenuId === audition.id ? (
                                      <motion.button
                                        key="close-button"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.15 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(null);
                                        }}
                                        className="p-3 rounded-full hover:bg-black/5 text-gray-600 transition-colors hover:cursor-pointer flex-shrink-0"
                                        aria-label="Close menu"
                                      >
                                        <X className="w-4 h-4" />
                                      </motion.button>
                                    ) : (
                                      <motion.button
                                        key="menu-button"
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.8 }}
                                        transition={{ duration: 0.15 }}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setOpenMenuId(audition.id);
                                        }}
                                        className="p-3 rounded-full hover:bg-white/50 text-gray-600 transition-colors hover:cursor-pointer flex-shrink-0"
                                        aria-label="Open menu"
                                      >
                                        <EllipsisVertical className="w-4 h-4" />
                                      </motion.button>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="block sm:hidden overflow-y-auto px-2 pb-6 hide-scrollbar">
                {filteredAndSortedAuditions.map((audition) => (
                  <AuditionCard
                    key={audition.id}
                    audition={audition}
                    onEdit={() => openModalWithData(audition)}
                    onDelete={() => handleDelete(audition.id)}
                    openMenuId={openMenuId}
                    setOpenMenuId={setOpenMenuId}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>

              {/* Footer */}
              <div className="pb-10 pt-4 bg-transparent text-sm text-primary-dark text-center">
                Currently tracking:
                <span className="font-semibold ml-1.5">
                  {filteredAndSortedAuditions.length} total auditions
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add/Update Modal */}
      {isModalOpen && (
        <AuditionModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          auditionTypes={auditionTypes}
          billings={billingTypes}
          initialData={formData}
          isEditing={isEditing}
          isSubmitting={isSubmitting}
          updateFormData={setFormData}
          formData={formData}
          handleInputChange={handleInputChange}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog {...dialogProps} />
    </DashboardLayout>
  );
}

export default function TrackerPage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          header="Audition Tracker"
          message="Loading your audition history"
          mode="light"
        />
      }
    >
      <TrackerPageContent />
    </Suspense>
  );
}
