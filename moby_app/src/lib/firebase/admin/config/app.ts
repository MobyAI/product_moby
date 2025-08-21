export const runtime = 'nodejs';

import 'server-only';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
// import { getFirestore } from 'firebase-admin/firestore';
// import { getStorage } from 'firebase-admin/storage';

let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
    // Remove surrounding quotes if they exist
    privateKey = privateKey.replace(/^["']|["']$/g, '');

    // Replace escaped newlines with actual newlines
    if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
    }
}

const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
        // storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });

export const adminAuth = getAuth(app);
// export const adminDb = getFirestore(app);
// export const adminStorage = getStorage(app);