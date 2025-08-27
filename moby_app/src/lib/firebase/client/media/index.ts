import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, db } from '@/lib/firebase/client/config/app';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { HeadshotData, ResumeData } from '@/types/media';

const HEADSHOT_MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const RESUME_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const THUMBNAIL_MAX_WIDTH = 800;
const THUMBNAIL_QUALITY = 0.85; // JPEG quality

export async function uploadHeadshot(file: File, userId: string) {
    try {
        if (!file.type.startsWith('image/')) {
            throw new Error('File must be an image');
        }

        if (file.size > HEADSHOT_MAX_FILE_SIZE) {
            throw new Error('File size must be under 10MB');
        }

        // New upload replaces old one
        const headshotId = "current";
        // const headshotId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

        // Upload original
        const originalRef = ref(storage, `users/${userId}/headshots/${headshotId}/original`);
        const originalSnapshot = await uploadBytes(originalRef, file, {
            contentType: file.type,
            customMetadata: {
                originalName: file.name
            }
        });
        const originalUrl = await getDownloadURL(originalSnapshot.ref);

        // Create thumbnail using Canvas API
        const thumbnailBlob = await createThumbnail(file, THUMBNAIL_MAX_WIDTH, THUMBNAIL_QUALITY);

        const thumbnailRef = ref(storage, `users/${userId}/headshots/${headshotId}/thumbnail`);
        const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailBlob);
        const thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);

        // Get dimensions
        const dimensions = await getImageDimensions(file);

        const headshotData: HeadshotData = {
            id: headshotId,
            originalUrl,
            thumbnailUrl,
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            width: dimensions.width,
            height: dimensions.height,
            uploadedAt: serverTimestamp()
        };

        await setDoc(
            doc(db, 'users', userId, 'headshots', headshotId),
            headshotData
        );

        return { success: true, data: headshotData };

    } catch (error) {
        console.error('Error uploading headshot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Upload failed'
        };
    }
}

// Native Canvas API thumbnail creation
function createThumbnail(
    file: File,
    maxWidth: number,
    quality: number
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }

        img.onload = () => {
            // Calculate dimensions maintaining aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = (maxWidth / width) * height;
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create thumbnail'));
                    }
                    URL.revokeObjectURL(img.src);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
    });
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
            resolve({ width: img.width, height: img.height });
            URL.revokeObjectURL(img.src);
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
        };

        img.src = URL.createObjectURL(file);
    });
}

export async function uploadResume(file: File, userId: string) {
    const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!validTypes.includes(file.type)) {
        throw new Error('File must be PDF or DOCX');
    }

    if (file.size > RESUME_MAX_FILE_SIZE) {
        throw new Error('File size must be under 10MB');
    }

    // New upload replaces old one
    const resumeId = "current";
    // const resumeId = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const resumeRef = ref(storage, `users/${userId}/resumes/${resumeId}`);

    const snapshot = await uploadBytes(resumeRef, file, {
        contentType: file.type,
        customMetadata: {
            originalName: file.name
        }
    });

    const url = await getDownloadURL(snapshot.ref);

    const resumeData: ResumeData = {
        id: resumeId,
        url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type as ResumeData['mimeType'],
        uploadedAt: serverTimestamp()
    };

    await setDoc(
        doc(db, 'users', userId, 'resumes', resumeId),
        resumeData
    );

    return { success: true, data: resumeData };
}