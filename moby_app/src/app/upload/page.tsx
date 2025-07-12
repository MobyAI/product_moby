'use client';

import { useState } from 'react';
import UploadForm from './UploadForm';
import ParsedOutput from './ParsedOutput';
import { useRouter } from 'next/navigation';
import { saveScript } from '@/lib/api/dbFunctions/scripts';
import type { ScriptElement } from '@/types/script';

export default function UploadPage() {
    const [parsedData, setParsedData] = useState<ScriptElement[] | null>(null);
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const userID = 'demo-user'; // Replace with real auth ID later

    async function handleParsedScript(script: ScriptElement[]) {
        try {
            setLoading(true);
            const scriptID = await saveScript(script, userID);
            router.push(`/rehearsal-room?userID=${userID}&scriptID=${scriptID}`);
        } catch (err) {
            console.error('Failed to save script:', err);
            alert('Failed to save script. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold">Upload Your Script</h1>
            <UploadForm onParsed={setParsedData} />
            {parsedData && (
                <div className="space-y-4">
                    <button
                        onClick={() => handleParsedScript(parsedData)}
                        disabled={loading}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save and Rehearse'}
                    </button>
                    <ParsedOutput data={parsedData} />
                </div>
            )}
        </div>
    );
}