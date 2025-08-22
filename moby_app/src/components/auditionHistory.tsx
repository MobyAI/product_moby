import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, Calendar, Film, Tv, Video, Megaphone, User, Filter } from 'lucide-react';

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

const AuditionHistory = () => {
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'date', direction: 'desc' });
    const [filterType, setFilterType] = useState<ProjectTypeFilter>('all');
    const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');
    const [showTypeFilter, setShowTypeFilter] = useState<boolean>(false);
    const [showStatusFilter, setShowStatusFilter] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [auditionsData, setAuditionsData] = useState<AuditionData[]>([]);
    const typeFilterRef = useRef<HTMLDivElement>(null);
    const statusFilterRef = useRef<HTMLDivElement>(null);

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
        const fetchAuditions = async () => {
            try {
                setIsLoading(true);
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
                        }
                    ]);
                    setIsLoading(false);
                }, 500); // Simulate loading time
            } catch (error) {
                console.error('Error fetching auditions:', error);
                setIsLoading(false);
            }
        };

        fetchAuditions();
    }, []);

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
            case 'declined': return 'bg-gray-100 text-red-600';
            case 'callback': return 'bg-blue-100 text-blue-800';
            case 'hold': return 'bg-gray-100 text-purple-600';
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
    const filteredAndSortedAuditions = auditionsData
        .filter(audition => {
            const typeMatch = filterType === 'all' || audition.projectType === filterType;
            const statusMatch = filterStatus === 'all' || audition.status === filterStatus;
            return typeMatch && statusMatch;
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

    // Loading state
    if (isLoading) {
        return (
            <div className="w-full bg-white rounded-lg shadow-sm p-8">
                <div className="flex justify-center items-center">
                    <div className="text-gray-500">Loading auditions...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white rounded-lg shadow-sm">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Audition History</h2>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th
                                onClick={() => handleSort('date')}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    {sortConfig.key === 'date' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                            </th>
                            <th
                                onClick={() => handleSort('projectName')}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-1">
                                    Project
                                    {sortConfig.key === 'projectName' && (
                                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                                    )}
                                </div>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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

                                    {/* Dropdown filter */}
                                    {showTypeFilter && (
                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 min-w-[120px]">
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
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Casting
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Source
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Billing
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative">
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

                                    {/* Dropdown filter */}
                                    {showStatusFilter && (
                                        <div className="absolute top-full right-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 z-50 min-w-[120px]">
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
                                                    setFilterStatus('completed');
                                                    setShowStatusFilter(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'completed' ? 'bg-gray-100 font-medium' : ''
                                                    }`}
                                            >
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                                    Completed
                                                </span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setFilterStatus('declined');
                                                    setShowStatusFilter(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'declined' ? 'bg-gray-100 font-medium' : ''
                                                    }`}
                                            >
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                                    Declined
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
                                                    setFilterStatus('hold');
                                                    setShowStatusFilter(false);
                                                }}
                                                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${filterStatus === 'hold' ? 'bg-gray-100 font-medium' : ''
                                                    }`}
                                            >
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                                                    Hold
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
                                        </div>
                                    )}
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredAndSortedAuditions.map((audition) => (
                            <tr key={audition.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        {new Date(audition.date).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {audition.projectName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        {getProjectIcon(audition.projectType)}
                                        <span className="capitalize">{audition.projectType}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-gray-400" />
                                        {audition.castingDirector}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {audition.role}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {audition.source}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBillingStyle(audition.billing)}`}>
                                        {audition.billing}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(audition.status)}`}>
                                        {audition.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer with count */}
            <div className="px-6 py-3 border-t border-gray-200 text-sm text-gray-500">
                Showing {filteredAndSortedAuditions.length} of {auditionsData.length} auditions
            </div>
        </div>
    );
};

export default AuditionHistory;