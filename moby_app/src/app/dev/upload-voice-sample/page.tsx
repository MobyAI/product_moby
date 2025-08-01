'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { uploadVoiceSample } from '@/lib/api/dbFunctions/audio/tts';

export default function UploadSamplePage() {
    const searchParams = useSearchParams();
    const secret = searchParams.get('secret');

    if (secret !== '298fjesdf8u98w') {
        return <div>Unauthorized</div>;
    }

    const [file, setFile] = useState<File | null>(null);
    const [voiceId, setVoiceId] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [uploadUrl, setUploadUrl] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!file || !voiceId || !name || !description) {
            alert('Please fill out all fields and choose a file.');
            return;
        }

        try {
            await uploadVoiceSample({ file, voiceId, voiceName: name, description });
            const safeName = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
            const url = `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/voice-samples%2F${safeName}.mp3?alt=media`;
            setUploadUrl(url);
            alert('Upload complete!');
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Upload failed.');
        }
    };

    return (
        <div className="p-6 max-w-xl mx-auto space-y-4">
            <h1 className="text-2xl font-bold">Upload Voice Sample</h1>

            <input type="file" accept="audio/mp3" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <input type="text" placeholder="Voice ID" value={voiceId} onChange={(e) => setVoiceId(e.target.value)} className="w-full border p-2" />
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full border p-2" />
            <input type="text" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border p-2" />

            <button onClick={handleUpload} className="bg-blue-600 text-white px-4 py-2 rounded">
                Upload
            </button>

            {uploadUrl && (
                <div className="mt-4">
                    <p className="text-sm text-green-600">Uploaded!</p>
                    <audio controls src={uploadUrl} className="mt-2 w-full" />
                    <p className="text-xs break-all">{uploadUrl}</p>
                </div>
            )}
        </div>
    );
}