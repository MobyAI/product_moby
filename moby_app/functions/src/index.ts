import { onCall, HttpsError } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Set global options for cost control
setGlobalOptions({ maxInstances: 100 });

// ============================================================================
// TYPES
// ============================================================================

interface BetaCodeData {
  code: string;
  isActive: boolean;
  usedBy: string | null;
  usedAt: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
  createdBy?: string;
  expiresAt: admin.firestore.Timestamp | null;
  maxUses: number;
  usedCount?: number;
  usedByUsers?: string[];
}

interface UserData {
  accessLevel?: "no_access" | "beta" | "paid" | "expired";
  betaExpiresAt?: admin.firestore.Timestamp;
  subscriptionStatus?: "inactive" | "active" | "canceled";
  betaCode?: string;
  betaActivatedAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
  firstName?: string;
  lastName?: string;
  age?: number;
  height?: string;
  ethnicity?: string;
  uid?: string;
  email?: string | null;
  countingStats?: {
    auditions: number;
    completed: number;
    declined: number;
    callbacks: number;
    holds: number;
    bookings: number;
  };
  createdAt?: admin.firestore.Timestamp;
}

interface CustomClaims {
  accessLevel?: "no_access" | "beta" | "paid" | "expired";
  betaExpiresAt?: number;
  admin?: boolean;
}

// ============================================================================
// FUNCTION 1: Set Default Access When User Document Created
// ============================================================================

export const onUserDocumentCreated = onDocumentCreated(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;

    try {
      // Check if user already has custom claims
      const user = await admin.auth().getUser(userId);

      // Only set if they don't have accessLevel yet
      if (!user.customClaims?.accessLevel) {
        const claims: CustomClaims = {
          accessLevel: "no_access",
        };

        await admin.auth().setCustomUserClaims(userId, claims);

        console.log(`✅ Set no_access for user: ${userId}`);
      } else {
        console.log(
          `ℹ️  User ${userId} already has accessLevel: ${user.customClaims.accessLevel}`
        );
      }

      return null;
    } catch (error) {
      console.error(`❌ Error setting custom claims for ${userId}:`, error);
      // Don't throw - we don't want to fail document creation
      return null;
    }
  }
);

// ============================================================================
// FUNCTION 2: Redeem Beta Code
// ============================================================================

interface RedeemBetaCodeData {
  code: string;
}

interface RedeemBetaCodeResult {
  success: boolean;
  message: string;
  expiresAt: string;
  daysGranted: number;
}

export const redeemBetaCode = onCall<RedeemBetaCodeData>(
  async (request): Promise<RedeemBetaCodeResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to redeem a beta code"
      );
    }

    const userId: string = request.auth.uid;
    const codeInput: string = (request.data.code || "").toUpperCase().trim();

    // 2. INPUT VALIDATION
    if (!codeInput) {
      throw new HttpsError("invalid-argument", "Beta code is required");
    }

    if (codeInput.length < 4 || codeInput.length > 20) {
      throw new HttpsError(
        "invalid-argument",
        "Beta code must be between 4 and 20 characters"
      );
    }

    const db = admin.firestore();

    try {
      // 3. FIND THE BETA CODE
      const codeQuery = await db
        .collection("betaCodes")
        .where("code", "==", codeInput)
        .limit(1)
        .get();

      if (codeQuery.empty) {
        throw new HttpsError(
          "not-found",
          "Invalid beta code. Please check and try again."
        );
      }

      const codeDoc = codeQuery.docs[0];
      const codeData = codeDoc.data() as BetaCodeData;

      // 4. VALIDATE CODE STATUS
      if (!codeData.isActive) {
        throw new HttpsError(
          "failed-precondition",
          "This beta code has been deactivated"
        );
      }

      // Check if code has reached max uses
      const currentUsedCount = codeData.usedCount || 0;
      if (currentUsedCount >= codeData.maxUses) {
        throw new HttpsError(
          "failed-precondition",
          "This beta code has reached its maximum number of uses"
        );
      }

      // Check if THIS USER already used this code
      const usedByUsers = codeData.usedByUsers || [];
      if (usedByUsers.includes(userId)) {
        throw new HttpsError(
          "already-exists",
          "You have already used this beta code"
        );
      }

      // Legacy check for old single-use codes
      if (codeData.maxUses === 1 && codeData.usedBy !== null) {
        throw new HttpsError(
          "failed-precondition",
          "This beta code has already been used"
        );
      }

      if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
        throw new HttpsError(
          "failed-precondition",
          "This beta code has expired"
        );
      }

      // 5. CHECK IF USER ALREADY HAS ACCESS
      const userDoc = await db.collection("users").doc(userId).get();

      if (userDoc.exists) {
        const userData = userDoc.data() as UserData | undefined;

        if (userData?.accessLevel === "paid") {
          throw new HttpsError(
            "already-exists",
            "You already have a paid subscription"
          );
        }

        if (userData?.accessLevel === "beta") {
          const existingExpiry = userData.betaExpiresAt?.toDate();
          if (existingExpiry && existingExpiry > new Date()) {
            throw new HttpsError(
              "already-exists",
              "You already have active beta access"
            );
          }
        }
      }

      // 6. GRANT BETA ACCESS
      const betaDuration: number = 30;
      const expiresAt: Date = new Date();
      expiresAt.setDate(expiresAt.getDate() + betaDuration);

      // Update custom claims
      const claims: CustomClaims = {
        accessLevel: "beta",
        betaExpiresAt: expiresAt.getTime(),
      };

      await admin.auth().setCustomUserClaims(userId, claims);

      // Update Firestore document
      const updateData: Partial<UserData> = {
        accessLevel: "beta",
        betaExpiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        subscriptionStatus: "inactive",
        betaCode: codeInput,
        betaActivatedAt:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      await db.collection("users").doc(userId).set(updateData, { merge: true });

      // Mark code as used - UPDATED SECTION
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const codeUpdateData: any = {
        usedCount: admin.firestore.FieldValue.increment(1),
        usedByUsers: admin.firestore.FieldValue.arrayUnion(userId),
      };

      // For single-use codes, also set usedBy/usedAt for backwards compatibility
      if (codeData.maxUses === 1) {
        codeUpdateData.usedBy = userId;
        codeUpdateData.usedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await codeDoc.ref.update(codeUpdateData);

      console.log(`✅ User ${userId} redeemed beta code: ${codeInput}`);

      return {
        success: true,
        message: "Beta access activated! You now have 30 days of free access.",
        expiresAt: expiresAt.toISOString(),
        daysGranted: betaDuration,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("❌ Unexpected error in redeemBetaCode:", error);

      throw new HttpsError(
        "internal",
        "An unexpected error occurred. Please try again."
      );
    }
  }
);

// ============================================================================
// FUNCTION 3: Create Beta Code (Admin Only)
// ============================================================================

interface CreateBetaCodeData {
  maxUses?: number;
  durationDays?: number;
}

interface CreateBetaCodeResult {
  success: boolean;
  code: string;
  maxUses: number;
  expiresAt: string | null;
  durationDays: number;
}

export const createBetaCode = onCall<CreateBetaCodeData>(
  async (request): Promise<CreateBetaCodeResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to create beta codes"
      );
    }

    // 2. ADMIN AUTHORIZATION CHECK
    const userClaims = request.auth.token as CustomClaims;
    if (!userClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can create beta codes"
      );
    }

    // 3. PREPARE CODE DATA
    const maxUses: number = request.data.maxUses || 1;
    const durationDays: number = request.data.durationDays || 30;

    // Calculate expiresAt based on durationDays (0 = unlimited)
    const expiresAt: admin.firestore.Timestamp | null =
      durationDays > 0
        ? admin.firestore.Timestamp.fromMillis(
            Date.now() + durationDays * 24 * 60 * 60 * 1000
          )
        : null;

    const db = admin.firestore();

    try {
      // 4. GENERATE UNIQUE CODE
      let code = generateRandomCode();
      let existingCode = await db
        .collection("betaCodes")
        .where("code", "==", code)
        .limit(1)
        .get();

      // Ensure uniqueness
      while (!existingCode.empty) {
        code = generateRandomCode();
        existingCode = await db
          .collection("betaCodes")
          .where("code", "==", code)
          .limit(1)
          .get();
      }

      // 5. CREATE THE CODE
      const newCodeData: BetaCodeData = {
        code: code,
        isActive: true,
        usedBy: null,
        usedAt: null,
        createdAt:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
        createdBy: request.auth.uid,
        expiresAt: expiresAt,
        maxUses: maxUses,
        usedCount: 0, // Initialize to 0
        usedByUsers: [], // Initialize to empty array
      };

      await db.collection("betaCodes").add(newCodeData);

      console.log(`✅ Beta code created: ${code} by ${request.auth.uid}`);

      return {
        success: true,
        code: code,
        maxUses: maxUses,
        expiresAt: expiresAt?.toDate().toISOString() || null,
        durationDays: durationDays,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("❌ Error creating beta code:", error);

      throw new HttpsError(
        "internal",
        "Failed to create beta code. Please try again."
      );
    }
  }
);

// ============================================================================
// FUNCTION 4: Revoke Beta Access (Admin Only)
// ============================================================================

interface RevokeBetaAccessData {
  uid: string;
}

interface RevokeBetaAccessResult {
  success: boolean;
  message: string;
}

export const revokeBetaAccess = onCall<RevokeBetaAccessData>(
  async (request): Promise<RevokeBetaAccessResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to revoke access"
      );
    }

    // 2. ADMIN AUTHORIZATION CHECK
    const userClaims = request.auth.token as CustomClaims;
    if (!userClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can revoke beta access"
      );
    }

    // 3. INPUT VALIDATION
    const targetUid = request.data.uid;
    if (!targetUid) {
      throw new HttpsError("invalid-argument", "User ID is required");
    }

    const db = admin.firestore();

    try {
      // 4. GET USER DOCUMENT
      const userDoc = await db.collection("users").doc(targetUid).get();

      if (!userDoc.exists) {
        throw new HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data() as UserData;
      const betaCode = userData.betaCode;

      // 5. UPDATE USER DOCUMENT
      const updateData: Partial<UserData> = {
        accessLevel: "no_access",
        betaExpiresAt: undefined,
        betaCode: undefined,
        betaActivatedAt: undefined,
        subscriptionStatus: "inactive",
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
      };

      await db
        .collection("users")
        .doc(targetUid)
        .set(updateData, { merge: true });

      // 6. UPDATE CUSTOM CLAIMS
      const claims: CustomClaims = {
        accessLevel: "no_access",
        betaExpiresAt: undefined,
      };

      await admin.auth().setCustomUserClaims(targetUid, claims);

      // 7. UPDATE BETA CODE DOCUMENT (if user had a code)
      if (betaCode) {
        const codeQuery = await db
          .collection("betaCodes")
          .where("code", "==", betaCode)
          .limit(1)
          .get();

        if (!codeQuery.empty) {
          const codeDoc = codeQuery.docs[0];
          const codeData = codeDoc.data() as BetaCodeData;

          // Remove user from usedByUsers array and decrement count
          const updatedUsers = (codeData.usedByUsers || []).filter(
            (uid) => uid !== targetUid
          );

          await codeDoc.ref.update({
            usedCount: Math.max(0, (codeData.usedCount || 0) - 1),
            usedByUsers: updatedUsers,
          });

          console.log(
            `✅ Removed user ${targetUid} from beta code ${betaCode}`
          );
        }
      }

      console.log(`✅ Revoked beta access for user: ${targetUid}`);

      return {
        success: true,
        message: `Beta access revoked for user ${targetUid}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("❌ Error revoking beta access:", error);

      throw new HttpsError(
        "internal",
        "Failed to revoke beta access. Please try again."
      );
    }
  }
);

// ============================================================================
// FUNCTION 5: Delete Beta Code and Revoke All Users (Admin Only)
// ============================================================================

interface DeleteBetaCodeData {
  code: string;
}

interface DeleteBetaCodeResult {
  success: boolean;
  message: string;
  usersRevoked: number;
}

export const deleteBetaCode = onCall<DeleteBetaCodeData>(
  async (request): Promise<DeleteBetaCodeResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to delete beta codes"
      );
    }

    // 2. ADMIN AUTHORIZATION CHECK
    const userClaims = request.auth.token as CustomClaims;
    if (!userClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can delete beta codes"
      );
    }

    // 3. INPUT VALIDATION
    const code = request.data.code?.toUpperCase().trim();
    if (!code) {
      throw new HttpsError("invalid-argument", "Beta code is required");
    }

    const db = admin.firestore();

    try {
      // 4. FIND THE BETA CODE
      const codeQuery = await db
        .collection("betaCodes")
        .where("code", "==", code)
        .limit(1)
        .get();

      if (codeQuery.empty) {
        throw new HttpsError("not-found", "Beta code not found");
      }

      const codeDoc = codeQuery.docs[0];
      const codeData = codeDoc.data() as BetaCodeData;
      const usedByUsers = codeData.usedByUsers || [];

      console.log(
        `🔍 Found beta code ${code} with ${usedByUsers.length} users`
      );

      // 5. REVOKE ACCESS FOR ALL USERS
      let revokedCount = 0;

      for (const userId of usedByUsers) {
        try {
          // Update user document
          const updateData: Partial<UserData> = {
            accessLevel: "no_access",
            betaExpiresAt: undefined,
            betaCode: undefined,
            betaActivatedAt: undefined,
            subscriptionStatus: "inactive",
            updatedAt:
              admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
          };

          await db
            .collection("users")
            .doc(userId)
            .set(updateData, { merge: true });

          // Update custom claims
          const claims: CustomClaims = {
            accessLevel: "no_access",
            betaExpiresAt: undefined,
          };

          await admin.auth().setCustomUserClaims(userId, claims);

          revokedCount++;
          console.log(`✅ Revoked access for user: ${userId}`);
        } catch (userError) {
          console.error(
            `⚠️ Failed to revoke access for user ${userId}:`,
            userError
          );
          // Continue with other users even if one fails
        }
      }

      // 6. DELETE THE BETA CODE
      await codeDoc.ref.delete();

      console.log(
        `✅ Deleted beta code ${code} and revoked ${revokedCount} users`
      );

      return {
        success: true,
        message: `Beta code ${code} deleted. Revoked access for ${revokedCount} user(s).`,
        usersRevoked: revokedCount,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("❌ Error deleting beta code:", error);

      throw new HttpsError(
        "internal",
        "Failed to delete beta code. Please try again."
      );
    }
  }
);

// ============================================================================
// FUNCTION 6: Get All Beta Codes (Admin Only)
// ============================================================================

interface GetAllBetaCodesResult {
  success: boolean;
  codes: BetaCodeData[];
}

export const getAllBetaCodes = onCall(
  async (request): Promise<GetAllBetaCodesResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to view beta codes"
      );
    }

    // 2. ADMIN AUTHORIZATION CHECK
    const userClaims = request.auth.token as CustomClaims;
    if (!userClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can view beta codes"
      );
    }

    const db = admin.firestore();

    try {
      // 3. GET ALL BETA CODES
      const codesSnapshot = await db
        .collection("betaCodes")
        .orderBy("createdAt", "desc")
        .get();

      const codes: BetaCodeData[] = codesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          code: data.code || doc.id,
          isActive: data.isActive ?? true,
          usedBy: data.usedBy ?? null,
          usedAt: data.usedAt ?? null,
          createdAt: data.createdAt,
          createdBy: data.createdBy,
          expiresAt: data.expiresAt ?? null,
          maxUses: data.maxUses ?? 1,
          usedCount: data.usedCount ?? 0,
          usedByUsers: data.usedByUsers ?? [],
        } as BetaCodeData;
      });

      console.log(`✅ Retrieved ${codes.length} beta codes for admin`);

      return {
        success: true,
        codes,
      };
    } catch (error) {
      console.error("❌ Error fetching beta codes:", error);

      throw new HttpsError(
        "internal",
        "Failed to fetch beta codes. Please try again."
      );
    }
  }
);

// ============================================================================
// FUNCTION 7: Get Beta Code Users (Admin Only)
// ============================================================================

interface BetaCodeUser {
  uid: string;
  email: string | null;
  betaActivatedAt: admin.firestore.Timestamp | null;
  betaExpiresAt: admin.firestore.Timestamp | null;
  accessLevel: string;
  betaCode?: string;
}

interface GetBetaCodeUsersData {
  code: string;
}

interface GetBetaCodeUsersResult {
  success: boolean;
  users: BetaCodeUser[];
}

export const getBetaCodeUsers = onCall<GetBetaCodeUsersData>(
  async (request): Promise<GetBetaCodeUsersResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to view beta code users"
      );
    }

    // 2. ADMIN AUTHORIZATION CHECK
    const userClaims = request.auth.token as CustomClaims;
    if (!userClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can view beta code users"
      );
    }

    // 3. INPUT VALIDATION
    const code = request.data.code?.toUpperCase().trim();
    if (!code) {
      throw new HttpsError("invalid-argument", "Beta code is required");
    }

    const db = admin.firestore();

    try {
      // 4. GET THE BETA CODE
      const codeQuery = await db
        .collection("betaCodes")
        .where("code", "==", code)
        .limit(1)
        .get();

      if (codeQuery.empty) {
        throw new HttpsError("not-found", "Beta code not found");
      }

      const codeData = codeQuery.docs[0].data() as BetaCodeData;
      const userIds = codeData.usedByUsers || [];

      if (userIds.length === 0) {
        return {
          success: true,
          users: [],
        };
      }

      // 5. FETCH USER DATA FOR ALL USERS WHO USED THIS CODE
      const userPromises = userIds.map((uid) =>
        db.collection("users").doc(uid).get()
      );

      const userDocs = await Promise.all(userPromises);

      const users: BetaCodeUser[] = userDocs
        .filter((doc) => doc.exists)
        .map((doc) => {
          const data = doc.data()!;
          return {
            uid: doc.id,
            email: data.email || null,
            betaActivatedAt: data.betaActivatedAt || null,
            betaExpiresAt: data.betaExpiresAt || null,
            accessLevel: data.accessLevel || "no_access",
            betaCode: data.betaCode,
          };
        });

      console.log(`✅ Retrieved ${users.length} users for code ${code}`);

      return {
        success: true,
        users,
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      console.error("❌ Error fetching beta code users:", error);

      throw new HttpsError(
        "internal",
        "Failed to fetch users. Please try again."
      );
    }
  }
);

// ============================================================================
// FUNCTION 8: Get All Beta Users (Admin Only)
// ============================================================================

interface GetAllBetaUsersResult {
  success: boolean;
  users: BetaCodeUser[];
}

export const getAllBetaUsers = onCall(
  async (request): Promise<GetAllBetaUsersResult> => {
    // 1. AUTHENTICATION CHECK
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "You must be logged in to view beta users"
      );
    }

    // 2. ADMIN AUTHORIZATION CHECK
    const userClaims = request.auth.token as CustomClaims;
    if (!userClaims.admin) {
      throw new HttpsError(
        "permission-denied",
        "Only admins can view beta users"
      );
    }

    const db = admin.firestore();

    try {
      // 3. GET ALL USERS WITH BETA ACCESS
      const usersSnapshot = await db
        .collection("users")
        .where("accessLevel", "==", "beta")
        .get();

      const users: BetaCodeUser[] = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email || null,
          betaActivatedAt: data.betaActivatedAt || null,
          betaExpiresAt: data.betaExpiresAt || null,
          accessLevel: data.accessLevel || "no_access",
          betaCode: data.betaCode,
        };
      });

      console.log(`✅ Retrieved ${users.length} beta users`);

      return {
        success: true,
        users,
      };
    } catch (error) {
      console.error("❌ Error fetching beta users:", error);

      throw new HttpsError(
        "internal",
        "Failed to fetch beta users. Please try again."
      );
    }
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateRandomCode(): string {
  const chars: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code: string = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
