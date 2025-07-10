'use client';

import { useState } from 'react';

export default function UploadForm({ onParsed }: { onParsed: (data: any) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || isLoading) return;

        setIsLoading(true);
        setMessage('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/parse', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('Script parsed successfully!');
                const parsedScript = JSON.parse(data.parsed);
                onParsed(parsedScript);
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (error) {
            setMessage('Error: Failed to parse script');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isLoading}
                required
            />
            <button
                type="submit"
                disabled={!file || isLoading}
                className={`px-4 py-2 rounded font-medium transition-colors ${!file || isLoading
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
            >
                {isLoading ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                            />
                            <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                        </svg>
                        Parsing! This may take a moment.
                    </span>
                ) : (
                    'Upload and Parse'
                )}
            </button>
            {message && (
                <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'
                    }`}>
                    {message}
                </p>
            )}
        </form>
    );
}