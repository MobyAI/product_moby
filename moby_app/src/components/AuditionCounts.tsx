"use client";

import { useEffect, useState } from "react";
import { getCountingStats } from "@/lib/firebase/client/user";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";

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

function StatCard({ label, count, bgColor, textColor = "text-black" }: StatCardProps) {
    return (
        <div
            className={`${bgColor} rounded-2xl p-4 min-w-[150px] shadow-sm hover:shadow-md transition-shadow`}
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

export default function AuditionCounts() {
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
    const [authReady, setAuthReady] = useState(false);

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
    }, [authReady]);

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
        { label: "Auditions", count: stats.auditions, bgColor: "bg-yellow-100", textColor: "text-gray-900" },
        { label: "Completed", count: stats.completed, bgColor: "bg-purple-100", textColor: "text-gray-900" },
        { label: "Declined", count: stats.declined, bgColor: "bg-red-100", textColor: "text-gray-900" },
        { label: "Callbacks", count: stats.callbacks, bgColor: "bg-blue-100", textColor: "text-gray-900" },
        { label: "Hold", count: stats.holds, bgColor: "bg-pink-100", textColor: "text-gray-900" },
        { label: "Bookings", count: stats.bookings, bgColor: "bg-green-100", textColor: "text-gray-900" },
    ];

    return (
        <div className="flex gap-4 overflow-x-auto space-x-1">
            {statCards.map((stat) => (
                <StatCard
                    key={stat.label}
                    label={stat.label}
                    count={stat.count}
                    bgColor={stat.bgColor}
                    textColor={stat.textColor}
                />
            ))}
        </div>
    );
}