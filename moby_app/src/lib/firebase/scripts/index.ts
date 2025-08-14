import { db } from '@/lib/firebase/config/client';
import { requireUid } from '@/lib/firebase/verify';
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
    type CollectionReference,
    type DocumentReference,
} from 'firebase/firestore';
import type { ScriptElement } from '@/types/script';

export type ScriptDoc = {
    script: ScriptElement[];
    ownerUid: string;
    createdAt: any;
    updatedAt: any;
};

function userScriptsRefs() {
    const uid = requireUid();
    const coll = collection(db, 'users', uid, 'scripts') as CollectionReference<ScriptDoc>;
    const d = (id: string) => doc(db, 'users', uid, 'scripts', id) as DocumentReference<ScriptDoc>;
    return { uid, coll, doc: d };
}

export async function addScript(script: ScriptElement[]) {
    const { uid, coll } = userScriptsRefs();
    const ref = await addDoc(coll, {
        script,
        ownerUid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
    return ref.id;
}

export async function getScript(scriptID: string) {
    const { doc } = userScriptsRefs();
    const ref = doc(scriptID);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Script not found');
    return { id: snap.id, ...snap.data() };
}

export async function getAllScripts() {
    const { coll } = userScriptsRefs();
    const q = query(coll, orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateScript(scriptID: string, newScript: ScriptElement[]) {
    const { doc } = userScriptsRefs();
    await updateDoc(doc(scriptID), {
        script: newScript,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteScript(scriptID: string) {
    const { doc } = userScriptsRefs();
    await deleteDoc(doc(scriptID));
}

// //
// // Collection: users/{userID}/scripts
// //

// export async function addScript(script: ScriptElement[], userID: string) {
//     const ref = collection(db, 'users', userID, 'scripts');
//     const docRef = await addDoc(ref, {
//         script,
//         createdAt: new Date(),
//     });
//     return docRef.id;
// }

// export async function getScript(userID: string, scriptID: string) {
//     const ref = doc(db, 'users', userID, 'scripts', scriptID);
//     const snap = await getDoc(ref);
//     if (!snap.exists()) throw new Error('Script not found');
//     return { id: snap.id, ...snap.data() };
// }

// export async function getAllScripts(userID: string) {
//     const ref = collection(db, 'users', userID, 'scripts');
//     const snap = await getDocs(ref);
//     return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
// }

// export async function updateScript(
//     userID: string,
//     scriptID: string,
//     newScript: ScriptElement[]
// ) {
//     const ref = doc(db, 'users', userID, 'scripts', scriptID);
//     await updateDoc(ref, {
//         script: newScript,
//         updatedAt: new Date(),
//     });
// }

// export async function deleteScript(userID: string, scriptID: string) {
//     const ref = doc(db, 'users', userID, 'scripts', scriptID);
//     await deleteDoc(ref);
// }