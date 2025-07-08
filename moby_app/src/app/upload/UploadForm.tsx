'use client';

import { useState } from 'react';

export default function UploadForm({ onParsed }: { onParsed: (data: any) => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/parse', {
            method: 'POST',
            body: formData,
        });

        const data = await res.json();

        if (res.ok) {
            setMessage('Script parsed successfully!');
            onParsed(data.parsed);
        } else {
            setMessage(`Error: ${data.error}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
            />
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
                Upload and Parse
            </button>
            {message && <p>{message}</p>}
        </form>
    );
}