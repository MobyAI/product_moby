'use client';

import { useState } from 'react';
import UploadForm from './UploadForm';
import ParsedOutput from './ParsedOutput';
import { storeScript } from '@/lib/storeScript';
import { useRouter } from 'next/navigation';
import type { ScriptElement } from '@/types/script';

export default function UploadPage() {
    const [parsedData, setParsedData] = useState(null);

    const router = useRouter();
    const setScript = storeScript((s) => s.setScript);

    function handleParsedScript(script: ScriptElement[]) {
        setScript(script);
        router.push('/rehearsal-room');
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-xl font-bold">Upload Your Script</h1>
            <UploadForm onParsed={setParsedData} />
            {parsedData && (
                <div className="space-y-4">
                    <button
                        onClick={() => handleParsedScript(parsedData)}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                        Rehearse This Script
                    </button>
                    <ParsedOutput data={parsedData} />
                </div>
            )}
        </div>
    );
}