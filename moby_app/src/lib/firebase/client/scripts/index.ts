import { db } from '@/lib/firebase/client/config/app';
import { requireUid } from '@/lib/firebase/client/verify';
import { toFirestoreScript } from '@/lib/firebase/client/utils/mapper';
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
    type Timestamp,
    type FieldValue,
} from 'firebase/firestore';
import type { ScriptElement, ScriptDoc } from '@/types/script';

function userScriptsRefs() {
    const uid = requireUid();
    const coll = collection(db, 'users', uid, 'scripts') as CollectionReference<ScriptDoc>;
    const d = (id: string) => doc(db, 'users', uid, 'scripts', id) as DocumentReference<ScriptDoc>;
    return { uid, coll, doc: d };
}

export async function addScript(name: string, script: ScriptElement[]) {
    const { uid, coll } = userScriptsRefs();
    const ref = await addDoc(coll, {
        name,
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
        script: toFirestoreScript(newScript),
        updatedAt: serverTimestamp(),
    });
}

export async function deleteScript(scriptID: string) {
    const { doc } = userScriptsRefs();
    await deleteDoc(doc(scriptID));
}