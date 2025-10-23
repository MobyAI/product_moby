import { auth, db } from "@/lib/firebase/client/config/app";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  UserCredential,
  getAdditionalUserInfo,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// Helper function
async function createInitialUserDoc(userId: string, email: string | null) {
  try {
    await setDoc(
      doc(db, "users", userId),
      {
        uid: userId,
        email: email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    console.log("✅ Initial user doc created:", userId);
  } catch (error) {
    console.error("❌ Error creating user doc:", error);
  }
}

// Login - DON'T create doc (user already exists)
export async function loginWithEmailPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Google - Create doc ONLY for new users
export async function loginWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);

  // Check if this is a new user
  const additionalUserInfo = getAdditionalUserInfo(result);
  if (additionalUserInfo?.isNewUser) {
    await createInitialUserDoc(result.user.uid, result.user.email);
  }

  return result;
}

// Registration - Always create doc (new user)
export async function registerWithEmailPassword(
  email: string,
  password: string
): Promise<UserCredential> {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // Always create doc for new registrations
  await createInitialUserDoc(result.user.uid, result.user.email);

  return result;
}

export async function logout(): Promise<void> {
  return await signOut(auth);
}
