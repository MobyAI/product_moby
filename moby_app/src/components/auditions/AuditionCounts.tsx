"use client";

// import { getCountingStats } from "@/lib/firebase/client/user";
import { getCountingStatsWithFilters } from "@/lib/firebase/client/user";
import type { StatusFilter } from '@/types/audition';
import { useQuery } from '@tanstack/react-query';

// type CountingStats = {
//     auditions: number;
//     completed: number;
//     declined: number;
//     callbacks: number;
//     holds: number;
//     bookings: number;
// };

type StatCardProps = {
    label: string;
    count: number;
    bgColor: string;
    textColor?: string;
};

type AuditionCountsProps = {
    setFilterStatus: React.Dispatch<React.SetStateAction<StatusFilter>>;
};

function StatCard({ label, count, bgColor, textColor = "text-black" }: StatCardProps) {
    return (
        <div
            className={`${bgColor} rounded-2xl p-4 flex-1
            shadow-sm hover:shadow-md
            border border-transparent hover:border-gray-400
            transition-all min-h-[100px] flex flex-col justify-center items-center text-center`}
        >
            <div className={`text-md font-light ${textColor} mb-2`}>
                {label}
            </div>
            <div className={`text-5xl font-bold ${textColor}`}>
                {count}
            </div>
        </div>
    );
}

export default function AuditionCounts({ setFilterStatus }: AuditionCountsProps) {
    const {
        data: stats = {
            auditions: 0,
            completed: 0,
            declined: 0,
            callbacks: 0,
            holds: 0,
            bookings: 0,
        },
        isLoading: loading,
        error
    } = useQuery({
        queryKey: ['auditionStats'],
        queryFn: async () => {
            const result = await getCountingStatsWithFilters();
            if (result.success && result.data) {
                return result.data;
            }
            throw new Error(result.error || 'Failed to load stats');
        },
        staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    });

    if (loading) {
        return (
            <div className="flex gap-2 w-full">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse flex-1">
                        <div className="bg-gray-200 rounded-2xl p-4 h-[100px]"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-4">
                {error instanceof Error ? error.message : 'Failed to load stats'}
            </div>
        );
    }

    const statCards = [
        { label: "Audition", count: stats.auditions, bgColor: "bg-yellow-100", textColor: "text-gray-900" },
        { label: "Completed", count: stats.completed, bgColor: "bg-purple-100", textColor: "text-gray-900" },
        { label: "Declined", count: stats.declined, bgColor: "bg-red-100", textColor: "text-gray-900" },
        { label: "Callbacks", count: stats.callbacks, bgColor: "bg-blue-100", textColor: "text-gray-900" },
        { label: "Hold", count: stats.holds, bgColor: "bg-pink-100", textColor: "text-gray-900" },
        { label: "Bookings", count: stats.bookings, bgColor: "bg-green-100", textColor: "text-gray-900" },
    ];

    return (
        <div className="flex gap-2 w-full">
            {statCards.map((stat) => (
                <div
                    key={stat.label}
                    className="cursor-pointer flex-1"
                    onClick={() => {
                        switch (stat.label) {
                            case "Audition":
                                setFilterStatus("all");
                                break;
                            case "Completed":
                                setFilterStatus("completed");
                                break;
                            case "Declined":
                                setFilterStatus("declined");
                                break;
                            case "Callbacks":
                                setFilterStatus("callback");
                                break;
                            case "Hold":
                                setFilterStatus("hold");
                                break;
                            case "Bookings":
                                setFilterStatus("booked");
                                break;
                            default:
                                setFilterStatus("all");
                        }
                    }}
                >
                    <StatCard
                        label={stat.label}
                        count={stat.count}
                        bgColor={stat.bgColor}
                        textColor={stat.textColor}
                    />
                </div>
            ))}
        </div>
    );
}