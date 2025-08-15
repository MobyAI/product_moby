import 'server-only';

import { adminStorage } from '@/server/firebase/admin';

//
// Storage Path: users/{userID}/scripts/{scriptID}/embeddings/{index}.json
//

/**
 * Save embedding blob to Firebase Storage using Admin SDK
 */
export async function saveEmbeddingBlob(
    userID: string,
    scriptID: string,
    index: number,
    blob: Blob
): Promise<void> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Convert Blob to Buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload with appropriate metadata
    await file.save(buffer, {
        metadata: {
            contentType: blob.type || 'application/json',
            metadata: {
                userID,
                scriptID,
                index: index.toString(),
            }
        },
        resumable: false, // For smaller files, non-resumable is faster
    });
}

/**
 * Get a signed URL for accessing the embedding file
 * Note: Admin SDK doesn't use getDownloadURL, it uses signed URLs
 */
export async function getEmbeddingUrl(
    userID: string,
    scriptID: string,
    index: number
): Promise<string> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
        throw new Error(`Embedding file not found: ${path}`);
    }

    // Generate a signed URL that expires in 1 hour
    // You can adjust the expiration time as needed
    const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour from now
    });

    return url;
}

/**
 * Get a permanent public URL (requires file to be public)
 * Alternative to signed URLs if you want permanent URLs
 */
export async function getEmbeddingPublicUrl(
    userID: string,
    scriptID: string,
    index: number
): Promise<string> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Make the file public (use with caution!)
    await file.makePublic();

    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

/**
 * Delete embedding blob from Firebase Storage
 */
export async function deleteEmbeddingBlob(
    userID: string,
    scriptID: string,
    index: number
): Promise<void> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Check if file exists before attempting deletion
    const [exists] = await file.exists();
    if (!exists) {
        console.warn(`File does not exist, skipping deletion: ${path}`);
        return;
    }

    await file.delete();
}

/**
 * Delete all embeddings for a script
 */
export async function deleteAllScriptEmbeddings(
    userID: string,
    scriptID: string
): Promise<void> {
    const prefix = `users/${userID}/scripts/${scriptID}/embeddings/`;
    const bucket = adminStorage.bucket();

    // List all files with the prefix
    const [files] = await bucket.getFiles({ prefix });

    // Delete all files in parallel
    const deletePromises = files.map(file => file.delete());
    await Promise.all(deletePromises);

    console.log(`Deleted ${files.length} embedding files for script ${scriptID}`);
}

/**
 * Download embedding content directly
 */
export async function downloadEmbedding(
    userID: string,
    scriptID: string,
    index: number
): Promise<any> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Download the file content
    const [buffer] = await file.download();

    // Parse JSON content
    const content = buffer.toString('utf-8');
    return JSON.parse(content);
}

/**
 * Upload embedding from JSON object (convenience method)
 */
export async function uploadEmbeddingJson(
    userID: string,
    scriptID: string,
    index: number,
    data: any
): Promise<void> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    // Convert JSON to Buffer
    const jsonString = JSON.stringify(data);
    const buffer = Buffer.from(jsonString, 'utf-8');

    // Upload with appropriate metadata
    await file.save(buffer, {
        metadata: {
            contentType: 'application/json',
            metadata: {
                userID,
                scriptID,
                index: index.toString(),
            }
        },
        resumable: false,
    });
}

/**
 * Stream upload for large files (if needed in the future)
 */
export async function streamUploadEmbedding(
    userID: string,
    scriptID: string,
    index: number,
    stream: NodeJS.ReadableStream
): Promise<void> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    return new Promise((resolve, reject) => {
        stream
            .pipe(file.createWriteStream({
                metadata: {
                    contentType: 'application/json',
                },
                resumable: false,
            }))
            .on('error', reject)
            .on('finish', resolve);
    });
}

/**
 * Check if embedding exists
 */
export async function embeddingExists(
    userID: string,
    scriptID: string,
    index: number
): Promise<boolean> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    const [exists] = await file.exists();
    return exists;
}

/**
 * Get metadata for an embedding file
 */
export async function getEmbeddingMetadata(
    userID: string,
    scriptID: string,
    index: number
): Promise<any> {
    const path = `users/${userID}/scripts/${scriptID}/embeddings/${index}.json`;
    const bucket = adminStorage.bucket();
    const file = bucket.file(path);

    const [metadata] = await file.getMetadata();
    return metadata;
}