export async function uploadEmbeddingBlob({
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
    formData.append('embedding', blob);

    const res = await fetch(`/api/embed/storage/${userID}/${scriptID}`, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error('Failed to upload embedding blob');
    }
}

export async function fetchEmbeddingFromStorage({
    userID,
    scriptID,
    index,
}: {
    userID: string;
    scriptID: string;
    index: number;
}): Promise<number[] | null> {
    const res = await fetch(`/api/embed/storage/${userID}/${scriptID}?index=${index}`);
    if (!res.ok) {
        throw new Error('Failed to fetch embedding from storage');
    }
    const data = await res.json();
    return data.embedding ?? null;
}


export async function deleteEmbeddingBlob({
    userID,
    scriptID,
    index,
}: {
    userID: string;
    scriptID: string;
    index: number;
}): Promise<void> {
    const res = await fetch(`/api/embed/storage/${userID}/${scriptID}?index=${index}`, {
        method: 'DELETE',
    });

    if (!res.ok) {
        throw new Error('Failed to delete embedding blob');
    }
}

// Batch embeddings
export async function uploadEmbeddingBatch({
    userID,
    scriptID,
    batch,
}: {
    userID: string;
    scriptID: string;
    batch: Record<number, number[]>;
}): Promise<void> {
    const res = await fetch(`/api/embed/batch/${userID}/${scriptID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
    });

    if (!res.ok) {
        throw new Error('Failed to upload embedding batch');
    }
}

export async function fetchEmbeddingBatch({
    userID,
    scriptID,
}: {
    userID: string;
    scriptID: string;
}): Promise<Record<number, number[]>> {
    const res = await fetch(`/api/embed/batch/${userID}/${scriptID}`);

    if (!res.ok) {
        throw new Error('Failed to fetch embedding batch');
    }

    return await res.json();
}