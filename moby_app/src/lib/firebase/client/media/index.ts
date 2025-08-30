import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, collection, setDoc, getDocs, serverTimestamp, deleteDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { storage, db, auth } from "@/lib/firebase/client/config/app";
import type { HeadshotData, ResumeData } from "@/types/media";

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

        // Check current headshot count
        const headshotsSnapshot = await getDocs(
            collection(db, 'users', userId, 'headshots')
        );
        // Limit 3
        if (headshotsSnapshot.size >= 3) {
            throw new Error('Maximum of 3 headshots allowed. Please delete an existing headshot before uploading a new one.');
        }

        // New upload replaces old one
        // const headshotId = "current";

        const headshotId = `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

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

export async function getHeadshots(userId: string) {
    const targetUserId = userId || auth.currentUser?.uid;

    if (!targetUserId) {
        return {
            success: false,
            error: 'No user ID provided',
            data: null
        };
    }

    try {
        const headshotsSnapshot = await getDocs(
            collection(db, 'users', targetUserId, 'headshots')
        );

        const headshots = headshotsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as HeadshotData));

        return {
            success: true,
            data: headshots
        };
    } catch (error) {
        console.error('Error fetching headshots:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch headshots',
            data: null
        };
    }
}

export async function deleteHeadshot(headshotId: string, userId: string) {
    try {
        // Delete from Storage (both original and thumbnail)
        const originalRef = ref(storage, `users/${userId}/headshots/${headshotId}/original`);
        const thumbnailRef = ref(storage, `users/${userId}/headshots/${headshotId}/thumbnail`);

        // Delete files from storage
        await Promise.all([
            deleteObject(originalRef).catch(err => {
                console.warn('Original file may not exist:', err);
            }),
            deleteObject(thumbnailRef).catch(err => {
                console.warn('Thumbnail file may not exist:', err);
            })
        ]);

        // Delete from Firestore
        await deleteDoc(doc(db, 'users', userId, 'headshots', headshotId));

        return {
            success: true,
            message: 'Headshot deleted successfully'
        };

    } catch (error) {
        console.error('Error deleting headshot:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete headshot'
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

export async function getResume(userId: string) {
    const targetUserId = userId || auth.currentUser?.uid;

    if (!targetUserId) {
        return {
            success: false,
            error: 'No user ID provided',
            data: null
        };
    }

    try {
        const resumeSnapshot = await getDocs(
            collection(db, 'users', targetUserId, 'resumes')
        );

        if (resumeSnapshot.empty) {
            return {
                success: true,
                data: null
            };
        }

        const resumeDoc = resumeSnapshot.docs[0];
        const resume = {
            id: resumeDoc.id,
            ...resumeDoc.data()
        } as ResumeData;

        return {
            success: true,
            data: resume
        };
    } catch (error) {
        console.error('Error fetching resume:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch resume',
            data: null
        };
    }
}

export async function deleteResume(resumeId: string, userId: string) {
    try {
        // Delete from Storage
        const resumeRef = ref(storage, `users/${userId}/resumes/${resumeId}`);

        await deleteObject(resumeRef).catch(err => {
            console.warn('Resume file may not exist in storage:', err);
        });

        // Delete from Firestore
        await deleteDoc(doc(db, 'users', userId, 'resumes', resumeId));

        return {
            success: true,
            message: 'Resume deleted successfully'
        };

    } catch (error) {
        console.error('Error deleting resume:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to delete resume'
        };
    }
}

export async function setAuthPhotoURL(photoURL: string): Promise<string> {
    try {
        const u = new URL(photoURL);
        if (!/^https?:/.test(u.protocol)) {
            throw new Error("URL must be http(s).");
        }
    } catch {
        throw new Error("Invalid photo URL.");
    }

    const user = auth.currentUser;
    if (!user) {
        throw new Error("Not signed in.");
    }

    // Update profile
    await updateProfile(user, { photoURL });

    // Ensure local user object reflects change (often not strictly necessary, but safe)
    await user.reload();

    return user.photoURL ?? photoURL;
}