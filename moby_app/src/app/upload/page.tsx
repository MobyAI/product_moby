'use client';

import { useState } from 'react';
import UploadForm from './UploadForm';
import ParsedOutput from './ParsedOutput';

export default function UploadPage() {
    const [parsedData, setParsedData] = useState(null);

    return (
        <div className="p-6">
            <h1 className="text-xl font-bold mb-4">Upload Your Script</h1>
            <UploadForm onParsed={setParsedData} />
            {parsedData && <ParsedOutput data={parsedData} />}
        </div>
    );
}