import { auth } from '@/lib/firebase/client/config/app';

export function requireUid(): string {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');
    return uid;
}