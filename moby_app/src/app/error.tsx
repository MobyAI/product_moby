// app/error.tsx
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        Sentry.captureException(error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center p-8 bg-white/90 rounded-xl shadow-lg max-w-lg">
                <h2 className="text-header-2 font-bold mb-4">Something went wrong!</h2>
                <p className="text-gray-600 mb-6">
                    {"We've been notified and will look into it."}
                </p>
                <button
                    onClick={() => reset()}
                    className="px-6 py-3 bg-purple-500 text-white rounded-full hover:bg-purple-600"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}