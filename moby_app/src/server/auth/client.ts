import { auth } from '@/lib/firebase/config/client';
import {
    signInWithPopup,
    GoogleAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    UserCredential
} from 'firebase/auth';

export async function loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
}

export async function loginWithEmailPassword(email: string, password: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmailPassword(email: string, password: string): Promise<UserCredential> {
    return await createUserWithEmailAndPassword(auth, email, password);
}

export async function logout(): Promise<void> {
    return await signOut(auth);
}