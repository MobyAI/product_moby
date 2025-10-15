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
  User,
  Filter,
  Search,
  X,
  Plus,
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
} from "@/lib/firebase/client/auditions";
import { toBasicError } from "@/types/error";
import {
  LoadingScreen,
  Button,
  DashboardLayout,
} from "@/components/ui";
import AuditionModal from "@/components/auditions/AuditionModal";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";

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
  const [showSearch, setShowSearch] = useState(false);

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

  // Refs
  const typeFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef(null);
  const parentRef = useRef(null);

  // Toast Message
  const { showToast } = useToast();

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

  // Refresh function to be passed to AddAuditionButton
  // const handleRefresh = async () => {
  //     console.log("Refreshing auditions data...");
  //     await loadAuditions();
  // };

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
    theater: { label: "Theater", icon: <User className="w-4 h-4" /> },
    voiceover: { label: "Voiceover", icon: <Video className="w-4 h-4" /> },
    other: { label: "Other", icon: <Video className="w-4 h-4" /> },
  };

  const getProjectIcon = (type: string) => {
    return projectTypeConfig[type]?.icon || <Video className="w-4 h-4" />;
  };

  // Status type config
  const statusConfig: Record<
    string,
    { label: string; bgColor: string; textColor: string }
  > = {
    completed: {
      label: "Completed",
      bgColor: "bg-purple-100",
      textColor: "text-purple-800",
    },
    declined: {
      label: "Declined",
      bgColor: "bg-red-100",
      textColor: "text-red-800",
    },
    callback: {
      label: "Callback",
      bgColor: "bg-blue-100",
      textColor: "text-blue-800",
    },
    hold: { label: "Hold", bgColor: "bg-pink-100", textColor: "text-pink-800" },
    booked: {
      label: "Booked",
      bgColor: "bg-green-100",
      textColor: "text-green-800",
    },
  };

  const getStatusStyle = (status: string) => {
    const config = statusConfig[status];
    return config
      ? `${config.bgColor} ${config.textColor}`
      : "bg-gray-100 text-gray-800";
  };

  // Billing badge style
  const getBillingStyle = (billing: string): string => {
    switch (billing) {
      case "star":
        return "bg-purple-100 text-purple-800";
      case "co-star":
        return "bg-indigo-100 text-indigo-800";
      case "extra":
        return "bg-gray-100 text-gray-600";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // const openModalWithData = (auditionData: any) => {
  //     // Pre-populate form data with the audition data
  //     setFormData({
  //         date: auditionData.date,
  //         projectTitle: auditionData.projectTitle || '',
  //         auditionType: auditionData.auditionType || '',
  //         castingDirector: auditionData.castingDirector || '',
  //         auditionRole: auditionData.auditionRole || '',
  //         source: auditionData.source || '',
  //         billing: auditionData.billing || '',
  //         status: auditionData.status || ''
  //     });

  //     // Set editing mode and store the ID for updates
  //     setIsEditing(true);
  //     setEditingId(auditionData.id); // Assuming each audition has a unique ID

  //     // Open the modal
  //     setIsModalOpen(true);
  // };
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
    theater: { label: "Theater", icon: <User className="w-4 h-4" /> },
    voiceover: { label: "Voiceover", icon: <Video className="w-4 h-4" /> },
    other: { label: "Other", icon: <Video className="w-4 h-4" /> },
  };

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
    <DashboardLayout maxWidth={90}>
      <div className="flex flex-col mx-[0%] min-h-0 flex-1">
        {/* Right-side controls (search + add button) */}
        <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
          {/* Search bar */}
          <div className="flex items-center">
            <div
              className={`flex items-center transition-all duration-300 ease-in-out border rounded-md mr-1 overflow-hidden ${
                showSearch ? "w-80 border-gray-300 bg-white" : "w-0 border-transparent bg-transparent"
              }`}
              style={{ height: "44px" }}
            >
              <div className="relative w-full">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search auditions..."
                  className={`
              w-full h-9 px-3 pr-0 text-sm bg-transparent
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
              }}
              variant="primary"
              size="md"
              icon={Search}
              iconOnly={true}
              className="h-10"
            />
          </div>

          {/* Add Button */}
          <Button
            onClick={() => setIsModalOpen(true)}
            variant="primary"
            size="md"
            icon={Plus}
            className="h-10"
          >
            New Audition
          </Button>
        </div>

        {/* Centered Header */}
        <div className="flex items-center justify-center mt-15 mb-4">
          <h2 className="text-header text-center">Audition Tracker</h2>
        </div>

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
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm mt-6 mb-20 min-h-0">
          {/* Fixed Table Header */}
          <div className="bg-gray-50 border-b border-gray-200 rounded-t-lg">
            <div className="flex px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div
                onClick={() => handleSort("date")}
                className="flex-none w-32 flex items-center gap-1 cursor-pointer hover:text-gray-700"
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
                className="flex-1 min-w-[200px] flex items-center gap-1 cursor-pointer hover:text-gray-700"
              >
                Project
                {sortConfig.key === "projectTitle" &&
                  (sortConfig.direction === "asc" ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  ))}
              </div>
              <div className="flex-none w-32">
                <div ref={typeFilterRef} className="relative inline-block">
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
                          filterType === "all" ? "bg-gray-100 font-medium" : ""
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
              <div className="flex-1 min-w-[150px]">Casting</div>
              <div className="flex-1 min-w-[120px]">Role</div>
              <div className="flex-1 min-w-[150px]">Source</div>
              <div className="flex-none w-28">Billing</div>
              <div className="flex-none w-28">
                <div ref={statusFilterRef} className="relative inline-block">
                  <button
                    onClick={() => setShowStatusFilter(!showStatusFilter)}
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
                      {Object.entries(statusConfig).map(([status, config]) => (
                        <button
                          key={status}
                          onClick={() => {
                            setFilterStatus(status as AuditionData["status"]);
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
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
                  No auditions found matching your filters
                </div>
              ) : (
                virtualizer.getVirtualItems().map((virtualRow) => {
                  const audition = filteredAndSortedAuditions[virtualRow.index];

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
                      <div
                        className="flex items-center px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-sm cursor-pointer h-15"
                        onClick={() => openModalWithData(audition)}
                      >
                        <div className="flex-none w-32 flex items-center gap-2 text-gray-400">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {new Date(audition.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </div>
                        <div className="flex-1 min-w-[200px] font-medium text-gray-900">
                          {audition.projectTitle}
                        </div>
                        <div className="flex-none w-32 flex items-center gap-2 text-gray-600 capitalize">
                          {getProjectIcon(audition.auditionType)}
                          <span>{audition.auditionType}</span>
                        </div>
                        <div className="flex-1 min-w-[150px] flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          {audition.castingDirector}
                        </div>
                        <div className="flex-1 min-w-[120px] text-gray-900">
                          {audition.auditionRole}
                        </div>
                        <div className="flex-1 min-w-[150px] text-gray-600">
                          {audition.source}
                        </div>
                        <div className="flex-none w-28 capitalize">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBillingStyle(
                              audition.billing
                            )}`}
                          >
                            {audition.billing}
                          </span>
                        </div>
                        <div className="flex-none w-28 capitalize">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(
                              audition.status
                            )}`}
                          >
                            {audition.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200 text-sm text-gray-500">
            Showing {filteredAndSortedAuditions.length} of{" "}
            {auditionsData.length} auditions
          </div>

          {/* Modal */}
          {isModalOpen && (
            <AuditionModal
              isOpen={isModalOpen}
              onClose={closeModal}
              onSubmit={handleSubmit}
              auditionTypes={auditionTypes}
              initialData={formData}
              isEditing={isEditing}
              isSubmitting={isSubmitting}
              updateFormData={setFormData}
              formData={formData}
              handleInputChange={handleInputChange}
            />
          )}
        </div>
      </div>
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
