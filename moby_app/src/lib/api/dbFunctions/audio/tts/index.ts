// Upload a TTS audio blob
export async function uploadTTSAudioBlob({
    userID,
    scriptID,
    index,
    blob,
}: {
    userID: string;
    scriptID: string;
    index: number;
    blob: Blob;
}): Promise<void> {
    const formData = new FormData();
    formData.append('index', String(index));
    formData.append('audio', blob);

    const res = await fetch(`/api/tts/storage/${userID}/${scriptID}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error('Failed to upload TTS audio blob');
    }
}

// Fetch a TTS audio blob
export async function fetchTTSAudioBlob({
    userID,
    scriptID,
    index,
}: {
    userID: string;
    scriptID: string;
    index: number;
}): Promise<Blob> {
    const res = await fetch(
        `/api/tts/storage/${userID}/${scriptID}?index=${index}`
    );

    if (!res.ok) {
        throw new Error('Failed to fetch TTS audio blob');
    }

    return await res.blob();
}

export async function fetchTTSAudioUrl({
    userID,
    scriptID,
    index,
}: {
    userID: string;
    scriptID: string;
    index: number;
}): Promise<string> {
    const res = await fetch(`/api/tts/storage/${userID}/${scriptID}?index=${index}`);

    if (!res.ok) {
        throw new Error('Failed to fetch TTS audio URL');
    }

    const data = await res.json();
    return data.url;
}

// Delete a TTS audio blob
export async function deleteTTSAudioBlob({
    userID,
    scriptID,
    index,
}: {
    userID: string;
    scriptID: string;
    index: number;
}): Promise<void> {
    const res = await fetch(
        `/api/tts/storage/${userID}/${scriptID}?index=${index}`,
        {
            method: 'DELETE',
        }
    );

    if (!res.ok) {
        throw new Error('Failed to delete TTS audio blob');
    }
}

// Update (overwrite) an existing TTS audio blob
export async function updateTTSAudioBlob({
    userID,
    scriptID,
    index,
    blob,
}: {
    userID: string;
    scriptID: string;
    index: number;
    blob: Blob;
}): Promise<void> {

    await uploadTTSAudioBlob({ userID, scriptID, index, blob });
}

// Fetch voice samples
interface VoiceSample {
    name: string;
    description: string;
    url: string;
    voiceId: string;
}

export async function fetchAllVoiceSamples(): Promise<VoiceSample[]> {
    const res = await fetch('/api/tts/samples');

    if (!res.ok) {
        throw new Error('Failed to fetch voice samples');
    }

    const data = await res.json();
    return data.samples;
}

// Upload voice samples
interface UploadVoiceSampleParams {
    file: File;
    voiceId: string;
    voiceName: string;
    description: string;
}

export async function uploadVoiceSample({
    file,
    voiceId,
    voiceName,
    description,
}: UploadVoiceSampleParams): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('voiceId', voiceId);
    formData.append('voiceName', voiceName);
    formData.append('description', description);

    const res = await fetch('/api/tts/samples', {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        type UploadError = { error?: string };

        let error: UploadError = {};
        
        try {
            const contentType = res.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                error = await res.json();
            }
        } catch (_) {
            // ignore JSON parse error
        }

        throw new Error(error?.error || 'Failed to upload voice sample');
    }
}  