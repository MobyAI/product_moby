"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
    X
} from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";
import AuditionCounts from "./AuditionCounts";

export interface AuditionData {
    id: number | string;
    date: string; // ISO date string format (YYYY-MM-DD)
    projectName: string;
    projectType: 'tv' | 'film' | 'commercial' | 'theater' | 'voiceover' | 'other';
    castingDirector: string;
    role: string;
    source: string;
    billing: 'star' | 'co-star' | 'guest-star' | 'recurring' | 'extra' | 'featured' | 'lead' | 'supporting';
    status: 'completed' | 'booked' | 'callback' | 'declined' | 'hold';
}

// Filter types
type ProjectTypeFilter = AuditionData['projectType'] | 'all';
type StatusFilter = AuditionData['status'] | 'all';

// Sort configuration type
interface SortConfig {
    key: keyof AuditionData;
    direction: 'asc' | 'desc';
}

export default function AuditionHistory() {
    // State Management
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
    const [filterType, setFilterType] = useState<ProjectTypeFilter>('all');
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
    const [showTypeFilter, setShowTypeFilter] = useState<boolean>(false);
    const [showStatusFilter, setShowStatusFilter] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [authReady, setAuthReady] = useState(false);
    const [auditionsData, setAuditionsData] = useState<AuditionData[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showSearch, setShowSearch] = useState(false);

    // Refs
    const typeFilterRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef(null);
    const parentRef = useRef(null);

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

    // Fetch auditions data on component mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthReady(true);
            }
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!authReady) return;

        const fetchAuditions = async () => {
            try {
                setLoading(true);
                // TODO: Replace with actual API call
                // const response = await fetch('/api/auditions');
                // const data = await response.json();
                // setAuditionsData(data);

                // For now, using dummy data
                setTimeout(() => {
                    setAuditionsData([
                        {
                            id: 1,
                            date: '2024-03-15',
                            projectName: 'The Morning Show',
                            projectType: 'tv',
                            castingDirector: 'Sarah Johnson',
                            role: 'Reporter',
                            source: 'Agent Submission',
                            billing: 'co-star',
                            status: 'callback'
                        },
                        {
                            id: 2,
                            date: '2024-03-12',
                            projectName: 'Nike Summer Campaign',
                            projectType: 'commercial',
                            castingDirector: 'Mike Chen',
                            role: 'Lead Runner',
                            source: 'Direct Booking',
                            billing: 'star',
                            status: 'booked'
                        },
                        {
                            id: 3,
                            date: '2024-03-08',
                            projectName: 'Midnight Dreams',
                            projectType: 'film',
                            castingDirector: 'Emily Rodriguez',
                            role: 'Detective Harris',
                            source: 'Self Submission',
                            billing: 'star',
                            status: 'declined'
                        },
                        {
                            id: 4,
                            date: '2024-03-05',
                            projectName: 'Law & Order: SVU',
                            projectType: 'tv',
                            castingDirector: 'David Park',
                            role: 'Witness',
                            source: 'Agent Submission',
                            billing: 'co-star',
                            status: 'completed'
                        },
                        {
                            id: 5,
                            date: '2024-02-28',
                            projectName: 'Apple Tech Launch',
                            projectType: 'commercial',
                            castingDirector: 'Lisa Wang',
                            role: 'Tech Professional',
                            source: 'Casting Network',
                            billing: 'extra',
                            status: 'hold'
                        },
                        {
                            id: 6,
                            date: '2024-02-25',
                            projectName: 'The Inheritance',
                            projectType: 'film',
                            castingDirector: 'Robert Taylor',
                            role: 'Son',
                            source: 'Agent Submission',
                            billing: 'star',
                            status: 'callback'
                        },
                    ]);
                    setLoading(false);
                }, 500); // Simulate loading time
            } catch (error) {
                console.error('Error fetching auditions:', error);
                setLoading(false);
            }
        };

        fetchAuditions();
    }, [authReady]);

    // Project type icon mapping
    const getProjectIcon = (type: AuditionData['projectType']) => {
        switch (type) {
            case 'tv': return <Tv className="w-4 h-4" />;
            case 'film': return <Film className="w-4 h-4" />;
            case 'commercial': return <Megaphone className="w-4 h-4" />;
            default: return <Video className="w-4 h-4" />;
        }
    };

    // Status color mapping
    const getStatusStyle = (status: AuditionData['status']) => {
        switch (status) {
            case 'completed': return 'bg-gray-100 text-gray-600';
            case 'declined': return 'bg-red-100 text-red-600';
            case 'callback': return 'bg-blue-100 text-blue-800';
            case 'hold': return 'bg-purple-100 text-purple-600';
            case 'booked': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Billing badge style
    const getBillingStyle = (billing: AuditionData['billing']): string => {
        switch (billing) {
            case 'star': return 'bg-purple-100 text-purple-800';
            case 'co-star': return 'bg-indigo-100 text-indigo-800';
            case 'extra': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Sorting function
    const handleSort = (key: keyof AuditionData): void => {
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
                const typeMatch = filterType === 'all' || audition.projectType === filterType;
                const statusMatch = filterStatus === 'all' || audition.status === filterStatus;

                // Search filter
                const searchMatch = searchTerm === '' ||
                    audition.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.castingDirector.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    audition.source.toLowerCase().includes(searchTerm.toLowerCase());

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

    // Loading state
    if (loading) {
        return (
            <div className="w-full bg-white rounded-lg shadow-sm p-8">
                <div className="flex justify-center items-center">
                    <div className="text-gray-500">Loading auditions...</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-center m-2">
                <AuditionCounts />
            </div>
            <div className="w-full bg-white rounded-lg shadow-sm">
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
                                        className={`w-full h-9 px-3 pr-8 text-sm border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${showSearch ? 'rounded-l-md border-r-0' : ''
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
                                    onClick={() => handleSort('projectName')}
                                    className="flex-1 min-w-[200px] flex items-center gap-1 cursor-pointer hover:text-gray-700"
                                >
                                    Project
                                    {sortConfig.key === 'projectName' && (
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
                                                <button
                                                    onClick={() => {
                                                        setFilterType('tv');
                                                        setShowTypeFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${filterType === 'tv' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <Tv className="w-4 h-4" />
                                                    TV
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilterType('film');
                                                        setShowTypeFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${filterType === 'film' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <Film className="w-4 h-4" />
                                                    Film
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilterType('commercial');
                                                        setShowTypeFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${filterType === 'commercial' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <Megaphone className="w-4 h-4" />
                                                    Commercial
                                                </button>
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
                                                <button
                                                    onClick={() => {
                                                        setFilterStatus('booked');
                                                        setShowStatusFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'completed' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                                        Completed
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilterStatus('booked');
                                                        setShowStatusFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'declined' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                                        Declined
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilterStatus('booked');
                                                        setShowStatusFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'booked' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                                        Booked
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilterStatus('callback');
                                                        setShowStatusFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'callback' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                                                        Callback
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setFilterStatus('booked');
                                                        setShowStatusFilter(false);
                                                    }}
                                                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'booked' ? 'bg-gray-100 font-medium' : ''
                                                        }`}
                                                >
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                                                        Hold
                                                    </span>
                                                </button>
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
                                                <div className="flex px-6 py-4 border-b border-gray-200 hover:bg-gray-50 transition-colors text-sm">
                                                    <div className="flex-none w-32 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-gray-400" />
                                                        {new Date(audition.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric'
                                                        })}
                                                    </div>
                                                    <div className="flex-1 min-w-[200px] font-medium text-gray-900">
                                                        {audition.projectName}
                                                    </div>
                                                    <div className="flex-none w-32 flex items-center gap-2 text-gray-600">
                                                        {getProjectIcon(audition.projectType)}
                                                        <span className="capitalize">{audition.projectType}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-[150px] flex items-center gap-2 text-gray-600">
                                                        <User className="w-4 h-4 text-gray-400" />
                                                        {audition.castingDirector}
                                                    </div>
                                                    <div className="flex-1 min-w-[120px] text-gray-900">
                                                        {audition.role}
                                                    </div>
                                                    <div className="flex-1 min-w-[150px] text-gray-600">
                                                        {audition.source}
                                                    </div>
                                                    <div className="flex-none w-28">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBillingStyle(audition.billing)}`}>
                                                            {audition.billing}
                                                        </span>
                                                    </div>
                                                    <div className="flex-none w-28">
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

                {/* Footer with count */}
                <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
                    Showing {filteredAndSortedAuditions.length} of {auditionsData.length} auditions
                </div>
            </div>
        </>
    );
};