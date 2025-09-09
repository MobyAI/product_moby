"use client";

import { useEffect, useState } from "react";
import { getCountingStats } from "@/lib/firebase/client/user";
import type { StatusFilter } from '@/types/audition';

type CountingStats = {
    auditions: number;
    completed: number;
    declined: number;
    callbacks: number;
    holds: number;
    bookings: number;
};

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
            className={`${bgColor} rounded-2xl p-4 m-2 min-w-[150px]
            shadow-sm hover:shadow-md
            border border-transparent hover:border-gray-400
            transition-all`}
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
    const [stats, setStats] = useState<CountingStats>({
        auditions: 0,
        completed: 0,
        declined: 0,
        callbacks: 0,
        holds: 0,
        bookings: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                setLoading(true);
                const result = await getCountingStats();
                if (result.success && result.data) {
                    setStats(result.data);
                } else {
                    setError(result.error || 'Failed to load stats');
                }
            } catch (err) {
                setError('Failed to load stats');
                console.error('Error fetching stats:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex gap-4 overflow-x-auto pb-2">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="bg-gray-200 rounded-2xl p-4 min-w-[140px] h-[100px]"></div>
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-500 text-center p-4">
                {error}
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
        <div className="flex gap-4 overflow-x-auto">
            {statCards.map((stat) => (
                <div
                    key={stat.label}
                    className="cursor-pointer"
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