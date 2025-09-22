"use client";

import React, { useState, useEffect, useRef, useMemo, ReactElement, useCallback, Suspense } from "react";
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
import type { AuditionData, ProjectTypeFilter, StatusFilter, AuditionsData } from "@/types/audition";
import AuditionCounts from "./AuditionCounts";
import { addAudition, getAllAuditions, updateAudition } from "@/lib/firebase/client/auditions";
import { toBasicError } from "@/types/error";
import { LoadingScreen, Button } from "@/components/ui";
import AuditionModal from "./AuditionModal";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";

// Sort configuration type
interface SortConfig {
    key: keyof AuditionsData;
    direction: 'asc' | 'desc';
}

function AuditionHistoryContent() {
    // State Management
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
    const [filterType, setFilterType] = useState<ProjectTypeFilter>('all');
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
    const [showTypeFilter, setShowTypeFilter] = useState<boolean>(false);
    const [showStatusFilter, setShowStatusFilter] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showSearch, setShowSearch] = useState(false);

    const [formData, setFormData] = useState({
        date: '',
        projectTitle: '',
        castingDirector: '',
        auditionType: '',
        auditionRole: '',
        billing: '',
        source: '',
        status: '',
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
        queryKey: ['auditions'],
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
            if (typeFilterRef.current && !typeFilterRef.current.contains(event.target as Node)) {
                setShowTypeFilter(false);
            }
            if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
                setShowStatusFilter(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
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
        await queryClient.invalidateQueries({ queryKey: ['auditions'] });
        await queryClient.invalidateQueries({ queryKey: ['auditionStats'] });
    }, [queryClient]);

    // Project type config
    const projectTypeConfig: Record<string, { label: string; icon: ReactElement }> = {
        tv: { label: 'TV', icon: <Tv className="w-4 h-4" /> },
        film: { label: 'Film', icon: <Film className="w-4 h-4" /> },
        commercial: { label: 'Commercial', icon: <Megaphone className="w-4 h-4" /> },
        theater: { label: 'Theater', icon: <User className="w-4 h-4" /> },
        voiceover: { label: 'Voiceover', icon: <Video className="w-4 h-4" /> },
        other: { label: 'Other', icon: <Video className="w-4 h-4" /> }
    };

    const getProjectIcon = (type: string) => {
        return projectTypeConfig[type]?.icon || <Video className="w-4 h-4" />;
    };

    // Status type config
    const statusConfig: Record<string, { label: string; bgColor: string; textColor: string }> = {
        completed: { label: 'Completed', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
        declined: { label: 'Declined', bgColor: 'bg-red-100', textColor: 'text-red-800' },
        callback: { label: 'Callback', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
        hold: { label: 'Hold', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
        booked: { label: 'Booked', bgColor: 'bg-green-100', textColor: 'text-green-800' }
    };

    const getStatusStyle = (status: string) => {
        const config = statusConfig[status];
        return config ? `${config.bgColor} ${config.textColor}` : 'bg-gray-100 text-gray-800';
    };

    // Billing badge style
    const getBillingStyle = (billing: string): string => {
        switch (billing) {
            case 'star': return 'bg-purple-100 text-purple-800';
            case 'co-star': return 'bg-indigo-100 text-indigo-800';
            case 'extra': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Sorting function
    const handleSort = (key: keyof AuditionsData): void => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Filter and sort data
    const filteredAndSortedAuditions = useMemo(() => {
        return auditionsData
            .filter(audition => {
                const typeMatch = filterType === 'all' || audition.auditionType === filterType;
                const statusMatch = filterStatus === 'all' || audition.status === filterStatus;

                // Search filter
                const searchMatch = searchTerm === '' ||
                    audition.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.auditionRole.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.castingDirector.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.auditionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.billing.toLowerCase().includes(searchTerm.toLowerCase());

                return typeMatch && statusMatch && searchMatch;
            })
            .sort((a, b) => {
                if (sortConfig.key) {
                    const aValue = a[sortConfig.key];
                    const bValue = b[sortConfig.key];
                    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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
                projectTitle: auditionData.projectTitle || '',
                auditionType: auditionData.auditionType || '',
                castingDirector: auditionData.castingDirector || '',
                auditionRole: auditionData.auditionRole || '',
                source: auditionData.source || '',
                billing: auditionData.billing || '',
                status: auditionData.status || ''
            });
            setIsEditing(true);
            setEditingId(auditionData.id);
            setIsModalOpen(true);
        });
    };


    const resetForm = () => {
        setFormData({
            date: '',
            projectTitle: '',
            castingDirector: '',
            auditionType: '',
            auditionRole: '',
            billing: '',
            source: '',
            status: '',
        });
    };

    const closeModal = () => {
        setIsModalOpen(false);
        document.body.style.overflow = 'auto';
        resetForm();
        setIsEditing(false);
        setEditingId(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
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
                if (!formData.projectTitle || !formData.auditionRole || !formData.auditionType || !formData.date) {
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
            console.error('Error saving audition:', error);
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
        tv: { label: 'TV', icon: <Tv className="w-4 h-4" /> },
        film: { label: 'Film', icon: <Film className="w-4 h-4" /> },
        commercial: { label: 'Commercial', icon: <Megaphone className="w-4 h-4" /> },
        theater: { label: 'Theater', icon: <User className="w-4 h-4" /> },
        voiceover: { label: 'Voiceover', icon: <Video className="w-4 h-4" /> },
        other: { label: 'Other', icon: <Video className="w-4 h-4" /> }
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
        <div className="flex flex-col h-full">
            <div className="flex justify-end items-center pb-3">
                <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="primary"
                    size="md"
                    icon={Plus}
                >
                    Add Audition
                </Button>
            </div>
            <div className="flex justify-center m-2">
                <AuditionCounts setFilterStatus={setFilterStatus} />
            </div>
            <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm min-h-0">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-900">Audition History</h2>

                        {/* Search bar */}
                        <div className="flex items-center">
                            <div className={`flex items-center transition-all duration-300 ease-in-out ${showSearch ? 'w-64' : 'w-0'
                                } overflow-hidden`}>
                                <div className="relative w-full">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search auditions..."
                                        className={`
                                            w-full h-9 px-3 pr-8 text-sm 
                                            border border-gray-300 rounded-md
                                            focus:outline-none focus:ring-0 focus:border-gray-300
                                            ${showSearch ? 'rounded-l-md border-r-0' : ''
                                            }`}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') {
                                                setShowSearch(false);
                                                setSearchTerm('');
                                            }
                                        }}
                                    />
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setShowSearch(!showSearch);
                                    if (showSearch) {
                                        setSearchTerm('');
                                    }
                                }}
                                className={`h-9 px-3 border transition-colors ${showSearch
                                    ? 'bg-blue-100 text-blue-600 border-gray-300 rounded-r-md rounded-l-none'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-300 rounded-md'
                                    }`}
                            >
                                <Search className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Active filters indicator */}
                    {(filterType !== 'all' || filterStatus !== 'all' || searchTerm) && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                            <span className="text-gray-500">Active filters:</span>
                            {filterType !== 'all' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                    Type: {filterType}
                                    <button
                                        onClick={() => setFilterType('all')}
                                        className="ml-1 hover:text-blue-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {filterStatus !== 'all' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                    Status: {filterStatus}
                                    <button
                                        onClick={() => setFilterStatus('all')}
                                        className="ml-1 hover:text-blue-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                            {searchTerm && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                                    {`Search: "${searchTerm}"`}
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="ml-1 hover:text-blue-600"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Table Header */}
                <div className="overflow-x-auto">
                    <div className="min-w-full">
                        <div className="bg-gray-50 border-b border-gray-200">
                            <div className="flex px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div
                                    onClick={() => handleSort('date')}
                                    className="flex-none w-32 flex items-center gap-1 cursor-pointer hover:text-gray-700"
                                >
                                    Date
                                    {sortConfig.key === 'date' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                                <div
                                    onClick={() => handleSort('projectTitle')}
                                    className="flex-1 min-w-[200px] flex items-center gap-1 cursor-pointer hover:text-gray-700"
                                >
                                    Project
                                    {sortConfig.key === 'projectTitle' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                                <div className="flex-none w-32">
                                    <div
                                        ref={typeFilterRef}
                                        className="relative inline-block"
                                    >
                                        <button
                                            onClick={() => setShowTypeFilter(!showTypeFilter)}
                                            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                                        >
                                            Type
                                            <Filter className={`w-3 h-3 ${filterType !== 'all' ? 'text-blue-600' : ''}`} />
                                        </button>

                                        {showTypeFilter && (
                                            <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-[60] min-w-[120px]">
                                                <button
                                                    onClick={() => {
                                                        setFilterType('all');
                                                        setShowTypeFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterType === 'all' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    All
                                                </button>
                                                {Object.entries(projectTypeConfig).map(([type, config]) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => {
                                                            setFilterType(type as AuditionData['projectType']);
                                                            setShowTypeFilter(false);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${filterType === type ? 'bg-gray-100 font-medium' : ''
                                                            }`}
                                                    >
                                                        {config.icon}
                                                        {config.label}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-[150px]">Casting</div>
                                <div className="flex-1 min-w-[120px]">Role</div>
                                <div className="flex-1 min-w-[150px]">Source</div>
                                <div className="flex-none w-28">Billing</div>
                                <div className="flex-none w-28">
                                    <div
                                        ref={statusFilterRef}
                                        className="relative inline-block"
                                    >
                                        <button
                                            onClick={() => setShowStatusFilter(!showStatusFilter)}
                                            className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                                        >
                                            Status
                                            <Filter className={`w-3 h-3 ${filterStatus !== 'all' ? 'text-blue-600' : ''}`} />
                                        </button>

                                        {showStatusFilter && (
                                            <div className="absolute top-full right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-[60] min-w-[120px]">
                                                <button
                                                    onClick={() => {
                                                        setFilterStatus('all');
                                                        setShowStatusFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'all' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    All
                                                </button>
                                                {Object.entries(statusConfig).map(([status, config]) => (
                                                    <button
                                                        key={status}
                                                        onClick={() => {
                                                            setFilterStatus(status as AuditionData['status']);
                                                            setShowStatusFilter(false);
                                                        }}
                                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === status ? 'bg-gray-100 font-medium' : ''
                                                            }`}
                                                    >
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${config.bgColor} ${config.textColor} capitalize`}>
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

                        {/* Virtual Scroll Container */}
                        <div
                            ref={parentRef}
                            className="overflow-auto"
                            style={{ height: '500px' }}
                        >
                            <div
                                style={{
                                    height: `${virtualizer.getTotalSize()}px`,
                                    width: '100%',
                                    position: 'relative',
                                }}
                            >
                                {filteredAndSortedAuditions.length === 0 ? (
                                    <div className="flex justify-center items-center h-32 text-gray-500">
                                        No auditions found matching your filters
                                    </div>
                                ) : (
                                    virtualizer.getVirtualItems().map(virtualRow => {
                                        const audition = filteredAndSortedAuditions[virtualRow.index];

                                        return (
                                            <div
                                                key={virtualRow.key}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: `${virtualRow.size}px`,
                                                    transform: `translateY(${virtualRow.start}px)`,
                                                }}
                                            >
                                                <div
                                                    className="flex px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-sm"
                                                    onClick={() => openModalWithData(audition)}
                                                >
                                                    <div className="flex-none w-32 flex items-center gap-2 text-gray-400">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        {new Date(audition.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
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
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBillingStyle(audition.billing)}`}>
                                                            {audition.billing}
                                                        </span>
                                                    </div>
                                                    <div className="flex-none w-28 capitalize">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(audition.status)}`}>
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
                    </div>
                </div>

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

                {/* Footer with count */}
                <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
                    Showing {filteredAndSortedAuditions.length} of {auditionsData.length} auditions
                </div>
            </div>
        </div>
    );
};

export default function AuditionHistory() {
    return (
        <Suspense fallback={
            <LoadingScreen
                header="Audition Tracker"
                message="Loading your audition history"
                mode="light"
            />
        }>
            <AuditionHistoryContent />
        </Suspense>
    );
}