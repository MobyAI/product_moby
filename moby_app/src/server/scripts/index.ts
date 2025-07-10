import { db } from '@/server/firebase/db';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    deleteDoc,
    updateDoc,
} from 'firebase/firestore';
import type { ScriptElement } from '@/types/script';

//
// Collection: users/{userID}/scripts
//

export async function addScript(script: ScriptElement[], userID: string) {
    const ref = collection(db, 'users', userID, 'scripts');
    const docRef = await addDoc(ref, {
        script,
        createdAt: new Date(),
    });
    return docRef.id;
}

export async function getScript(userID: string, scriptID: string) {
    const ref = doc(db, 'users', userID, 'scripts', scriptID);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Script not found');
    return { id: snap.id, ...snap.data() };
}

export async function getAllScripts(userID: string) {
    const ref = collection(db, 'users', userID, 'scripts');
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateScript(
    userID: string,
    scriptID: string,
    newScript: ScriptElement[]
) {
    const ref = doc(db, 'users', userID, 'scripts', scriptID);
    await updateDoc(ref, {
        script: newScript,
        updatedAt: new Date(),
    });
}

export async function deleteScript(userID: string, scriptID: string) {
    const ref = doc(db, 'users', userID, 'scripts', scriptID);
    await deleteDoc(ref);
}