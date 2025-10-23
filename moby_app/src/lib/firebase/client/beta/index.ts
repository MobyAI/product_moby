import { db, auth } from "@/lib/firebase/client/config/app";
import { requireUid } from "@/lib/firebase/client/verify";
import {
  collection,
  addDoc,
  serverTimestamp,
  type CollectionReference,
} from "firebase/firestore";

interface BetaRequestDoc {
  email: string;
  name: string;
  uid: string;
  createdAt: any;
}

function betaRequestRefs() {
  const coll = collection(
    db,
    "beta-request-access"
  ) as CollectionReference<BetaRequestDoc>;
  return { coll };
}

export async function requestBetaAccess() {
  const uid = requireUid();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("No authenticated user found");
  }

  const email = user.email;
  const name = user.displayName || email?.split("@")[0] || "Unknown User";

  if (!email) {
    throw new Error("User email not found");
  }

  const { coll } = betaRequestRefs();
  const ref = await addDoc(coll, {
    email,
    name,
    uid,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}
