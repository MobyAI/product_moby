import { db, storage } from "@/lib/firebase/client/config/app";
import { requireUid } from "@/lib/firebase/client/verify";
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    serverTimestamp,
    query,
    orderBy,
    where,
    type CollectionReference,
    type DocumentReference,
} from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";

export interface AuditionDoc {
    date: string;
    projectTitle: string;
    castingDirector: string;
    // auditionType: 'tv' | 'film' | 'commercial' | 'theater' | 'voiceover' | 'other';
    auditionType: string;
    auditionRole: string;
    billing: string;
    // billing: 'star' | 'co-star' | 'guest-star' | 'recurring' | 'extra' | 'featured' | 'lead' | 'supporting';
    source: string;
    // status: 'booked' | 'declined' | 'callback' | 'hold' | 'completed' | '';
    status: string;
    ownerUid: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    createdAt: any; // serverTimestamp type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updatedAt: any; // serverTimestamp type
}

function userAuditionsRefs() {
    const uid = requireUid();
    const coll = collection(db, 'users', uid, 'auditions') as CollectionReference<AuditionDoc>;
    const d = (id: string) => doc(db, 'users', uid, 'auditions', id) as DocumentReference<AuditionDoc>;
    return { uid, coll, doc: d };
}

export async function addAudition(auditionData: Omit<AuditionDoc, 'ownerUid' | 'createdAt' | 'updatedAt'>) {
    const { uid, coll } = userAuditionsRefs();
    console.log('what is auditiondata', auditionData)
    const ref = await addDoc(coll, {
        ...auditionData,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getAudition(auditionID: string) {
    const { doc } = userAuditionsRefs();
    const ref = doc(auditionID);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Audition not found');
    return { id: snap.id, ...snap.data() };
}

export async function getAllAuditions() {
    const { coll } = userAuditionsRefs();
    const q = query(coll, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAuditionsByStatus(status: AuditionDoc['status']) {
    const { coll } = userAuditionsRefs();
    const q = query(coll, where('status', '==', status), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getAuditionsByType(auditionType: AuditionDoc['auditionType']) {
    const { coll } = userAuditionsRefs();
    const q = query(coll, where('auditionType', '==', auditionType), orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateAudition(auditionID: string, updates: Partial<Omit<AuditionDoc, 'id' | 'ownerUid' | 'createdAt' | 'updatedAt'>>) {
    const { doc } = userAuditionsRefs();
    console.log('what is update', updates)
    await updateDoc(doc(auditionID), {
        ...updates,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteAuditionAssets(auditionID: string) {
    const { uid } = userAuditionsRefs();
    const folderRef = ref(storage, `users/${uid}/auditions/${auditionID}`);

    async function deleteFolderContents(folder: ReturnType<typeof ref>): Promise<void> {
        try {
            const { items, prefixes } = await listAll(folder);
            // Delete all files directly in this folder
            await Promise.all(items.map((item) => deleteObject(item)));
            // Recursively delete subfolders
            await Promise.all(prefixes.map((subfolder) => deleteFolderContents(subfolder)));
        } catch (error) {
            // If folder doesn't exist, that's fine - nothing to delete
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((error as any)?.code !== 'storage/object-not-found') {
                throw error;
            }
        }
    }

    await deleteFolderContents(folderRef);
}

export async function deleteAudition(auditionID: string) {
    const { doc } = userAuditionsRefs();
    await deleteDoc(doc(auditionID));
    await deleteAuditionAssets(auditionID);
}

// Additional utility functions for audition management
export async function updateAuditionStatus(auditionID: string, status: AuditionDoc['status']) {
    const { doc } = userAuditionsRefs();
    await updateDoc(doc(auditionID), {
        status,
        updatedAt: serverTimestamp(),
    });
}

export async function getRecentAuditions(limit: number = 10) {
    const { coll } = userAuditionsRefs();
    const q = query(coll, orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.slice(0, limit).map(d => ({ id: d.id, ...d.data() }));
}