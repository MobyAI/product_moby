import { storage } from '@/lib/firebase/config/client';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

//
// Storage Path: users/{userID}/scripts/{scriptID}/embeddings/{index}.json
//

export async function saveEmbeddingBlob(userID: string, scriptID: string, index: number, blob: Blob) {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const embeddingRef = ref(storage, path);
    await uploadBytes(embeddingRef, blob);
}

export async function getEmbeddingUrl(userID: string, scriptID: string, index: number): Promise<string> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const embeddingRef = ref(storage, path);
    return await getDownloadURL(embeddingRef);
}

export async function deleteEmbeddingBlob(userID: string, scriptID: string, index: number) {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const embeddingRef = ref(storage, path);
    await deleteObject(embeddingRef);
}

// Path: users/{userID}/scripts/{scriptID}/embeddings/batch.json

export async function saveEmbeddingBatchBlob(userID: string, scriptID: string, json: object) {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/batch.json`;
    const embeddingRef = ref(storage, path);
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    await uploadBytes(embeddingRef, blob);
}

export async function getEmbeddingBatchBlob(userID: string, scriptID: string): Promise<object> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/batch.json`;
    const embeddingRef = ref(storage, path);

    const url = await getDownloadURL(embeddingRef);
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch embedding batch JSON');

    return await res.json();
}