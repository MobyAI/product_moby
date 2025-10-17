import { db, storage } from "@/lib/firebase/client/config/app";
import { requireUid } from "@/lib/firebase/client/verify";
import { toFirestoreScript } from "@/lib/firebase/client/utils/mapper";
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
} from "firebase/firestore";
import { ref, listAll, deleteObject } from "firebase/storage";
import type { ScriptElement, ScriptDoc } from "@/types/script";

function userScriptsRefs() {
  const uid = requireUid();
  const coll = collection(
    db,
    "users",
    uid,
    "scripts"
  ) as CollectionReference<ScriptDoc>;
  const d = (id: string) =>
    doc(db, "users", uid, "scripts", id) as DocumentReference<ScriptDoc>;
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
    lastPracticed: null,
    pinned: false,
  });
  return ref.id;
}

export async function getScript(scriptID: string) {
  const { doc } = userScriptsRefs();
  const ref = doc(scriptID);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Script not found");
  return { id: snap.id, ...snap.data() };
}

export async function getAllScripts() {
  const { coll } = userScriptsRefs();
  const q = query(coll, orderBy("updatedAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateScript(
  scriptID: string,
  newScript: ScriptElement[]
) {
  const { doc } = userScriptsRefs();
  await updateDoc(doc(scriptID), {
    script: toFirestoreScript(newScript),
    updatedAt: serverTimestamp(),
  });
}

export async function updateScriptName(scriptID: string, newName: string) {
  const { doc } = userScriptsRefs();
  await updateDoc(doc(scriptID), {
    name: newName,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleScriptPinned(scriptID: string) {
  const { doc } = userScriptsRefs();
  const docRef = doc(scriptID);

  // Get the current document to check if starred exists
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error(`Script with ID ${scriptID} not found`);
  }

  const currentPinned = docSnap.data().pinned ?? false;

  await updateDoc(docRef, {
    pinned: !currentPinned,
    pinnedAt: serverTimestamp(),
  });
}

export async function deleteScriptAssets(scriptID: string) {
  const { uid } = userScriptsRefs();
  const folderRef = ref(storage, `users/${uid}/scripts/${scriptID}`);

  async function deleteFolderContents(
    folder: ReturnType<typeof ref>
  ): Promise<void> {
    const { items, prefixes } = await listAll(folder);
    // Delete all files directly in this folder
    await Promise.all(items.map((item) => deleteObject(item)));
    // Recursively delete subfolders
    await Promise.all(
      prefixes.map((subfolder) => deleteFolderContents(subfolder))
    );
  }

  await deleteFolderContents(folderRef);
}

export async function deleteScript(scriptID: string) {
  const { doc } = userScriptsRefs();
  await deleteDoc(doc(scriptID));
  await deleteScriptAssets(scriptID);
}

export async function setLastPracticed(scriptID: string) {
  const { doc } = userScriptsRefs();
  await updateDoc(doc(scriptID), {
    lastPracticed: serverTimestamp(),
  });
}
