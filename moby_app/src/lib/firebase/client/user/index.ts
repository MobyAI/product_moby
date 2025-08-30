import {
    doc,
    setDoc,
    serverTimestamp,
    getDoc,
    Timestamp,
    FieldValue,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client/config/app";
import { UserProfile } from "@/types/profile";

export type CountingStats = {
    auditions: number;
    completed: number;
    declined: number;
    callbacks: number;
    holds: number;
    bookings: number;
};

export type UserData = UserProfile & {
    email: string | null;
    uid: string;
    countingStats: CountingStats;
    createdAt: Timestamp | FieldValue;
    updatedAt: Timestamp | FieldValue;
};

/**
 * Adds or updates user profile data in Firestore
 * Should be called after successful authentication
 */
export async function addUser(profile: UserProfile) {
    try {
        // Get the currently authenticated user
        const user = auth.currentUser;

        if (!user) {
            return {
                success: false,
                error: 'No authenticated user found. Please sign in first.'
            };
        }

        // Update Firebase Auth user profile
        const displayName = `${profile.firstName} ${profile.lastName}`.trim();
        await updateProfile(user, { displayName });

        // Prepare the user data
        const userData: UserData = {
            ...profile,
            uid: user.uid,
            email: user.email,
            countingStats: {
                auditions: 0,
                completed: 0,
                declined: 0,
                callbacks: 0,
                holds: 0,
                bookings: 0,
            },
            createdAt: serverTimestamp(), // Uses server timestamp
            updatedAt: serverTimestamp(),
        };

        // Save to Firestore using the user's UID as the document ID
        // This creates or overwrites the document
        await setDoc(doc(db, 'users', user.uid), userData, {
            merge: false // Set to true if you want to merge with existing data
        });

        console.log('User profile saved successfully:', user.uid);

        return {
            success: true,
            userId: user.uid
        };

    } catch (error) {
        console.error('Error saving user profile:', error);

        // Type-safe error handling
        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: false,
            error: 'An unexpected error occurred while saving your profile.'
        };
    }
}

/**
 * Fetches user profile data from Firestore
 */
export async function getUser(userId?: string) {
    try {
        // Use provided userId or current user's ID
        const targetUserId = userId || auth.currentUser?.uid;

        if (!targetUserId) {
            return {
                success: false,
                error: 'No user ID provided',
                data: null
            };
        }

        const userDoc = await getDoc(doc(db, 'users', targetUserId));

        if (userDoc.exists()) {
            return {
                success: true,
                data: userDoc.data() as UserData,
                error: null
            };
        } else {
            return {
                success: false,
                error: 'User profile not found',
                data: null
            };
        }

    } catch (error) {
        console.error('Error fetching user profile:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }

        return {
            success: false,
            error: 'Failed to fetch user profile',
            data: null
        };
    }
}

/**
 * Updates specific fields in the user profile
 */
export async function updateUserProfile(updates: Partial<UserProfile>) {
    try {
        const user = auth.currentUser;

        if (!user) {
            return {
                success: false,
                error: 'No authenticated user found'
            };
        }

        // Fetch existing user profile from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);
        const existingData: Partial<UserProfile> = userSnap.exists()
            ? (userSnap.data() as UserProfile)
            : {};

        // Merge: new values take precedence, fallback to existing ones
        const firstName = updates.firstName ?? existingData.firstName ?? "";
        const lastName = updates.lastName ?? existingData.lastName ?? "";

        // If we have at least one name, update displayName
        const newDisplayName = `${firstName} ${lastName}`.trim();
        if (newDisplayName.length > 0) {
            await updateProfile(user, { displayName: newDisplayName });
        }

        // Update only the specified fields plus updatedAt timestamp
        await setDoc(
            doc(db, 'users', user.uid),
            {
                ...updates,
                updatedAt: serverTimestamp(),
            },
            { merge: true } // Merge with existing document
        );

        return {
            success: true,
            userId: user.uid
        };

    } catch (error) {
        console.error('Error updating user profile:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: false,
            error: 'Failed to update profile'
        };
    }
}

/**
 * Checks if user profile exists in Firestore
 */
export async function checkUserProfileExists(): Promise<boolean> {
    try {
        const user = auth.currentUser;

        if (!user) return false;

        const userDoc = await getDoc(doc(db, 'users', user.uid));

        // Check if document exists
        if (!userDoc.exists()) {
            return false;
        }

        // Check if all required fields are present and valid
        const userData = userDoc.data();
        const requiredFields = ['firstName', 'lastName', 'age', 'height', 'ethnicity'];

        const hasCompleteProfile = requiredFields.every(field =>
            userData?.[field] !== undefined &&
            userData[field] !== null &&
            userData[field] !== ''
        );

        return hasCompleteProfile;

    } catch (error) {
        console.error('Error checking user profile:', error);
        return false;
    }
}

/**
 * Increment a specific counting stat for the user
 * @param statName - The name of the stat to increment
 * @param incrementBy - Amount to increment (default 1, use negative for decrement)
 */
export async function updateCountingStat(
    statName: keyof CountingStats,
    incrementBy: number = 1
) {
    try {
        const user = auth.currentUser;

        if (!user) {
            return {
                success: false,
                error: 'No authenticated user found'
            };
        }

        // First, get the current value
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            return {
                success: false,
                error: 'User profile not found'
            };
        }

        const currentData = userDoc.data() as UserData;
        const currentStats = currentData.countingStats || {
            auditions: 0,
            completed: 0,
            declined: 0,
            callbacks: 0,
            holds: 0,
            bookings: 0,
        };

        // Calculate new value (ensure it doesn't go below 0)
        const newValue = Math.max(0, (currentStats[statName] || 0) + incrementBy);

        // Update the specific stat
        await setDoc(
            doc(db, 'users', user.uid),
            {
                countingStats: {
                    ...currentStats,
                    [statName]: newValue,
                },
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        console.log(`Updated ${statName} to ${newValue} for user:`, user.uid);

        return {
            success: true,
            newValue,
            statName
        };

    } catch (error) {
        console.error('Error updating counting stat:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: false,
            error: 'Failed to update counting stat'
        };
    }
}

/**
 * Update multiple counting stats at once
 * @param updates - Object with stat names and their new values (not increments)
 */
export async function updateMultipleCountingStats(
    updates: Partial<CountingStats>
) {
    try {
        const user = auth.currentUser;

        if (!user) {
            return {
                success: false,
                error: 'No authenticated user found'
            };
        }

        // Ensure all values are non-negative
        const sanitizedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
            acc[key as keyof CountingStats] = Math.max(0, value || 0);
            return acc;
        }, {} as Partial<CountingStats>);

        // Update the stats
        await setDoc(
            doc(db, 'users', user.uid),
            {
                countingStats: sanitizedUpdates,
                updatedAt: serverTimestamp(),
            },
            { merge: true }
        );

        return {
            success: true,
            updates: sanitizedUpdates
        };

    } catch (error) {
        console.error('Error updating multiple counting stats:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: false,
            error: 'Failed to update counting stats'
        };
    }
}

/**
 * Get all counting stats for the current user
 */
export async function getCountingStats(): Promise<{
    success: boolean;
    data?: CountingStats;
    error?: string;
}> {
    try {
        const user = auth.currentUser;

        if (!user) {
            return {
                success: false,
                error: 'No authenticated user found'
            };
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (!userDoc.exists()) {
            return {
                success: false,
                error: 'User profile not found'
            };
        }

        const userData = userDoc.data() as UserData;

        return {
            success: true,
            data: userData.countingStats || {
                auditions: 0,
                completed: 0,
                declined: 0,
                callbacks: 0,
                holds: 0,
                bookings: 0,
            }
        };

    } catch (error) {
        console.error('Error fetching counting stats:', error);

        if (error instanceof Error) {
            return {
                success: false,
                error: error.message
            };
        }

        return {
            success: false,
            error: 'Failed to fetch counting stats'
        };
    }
}