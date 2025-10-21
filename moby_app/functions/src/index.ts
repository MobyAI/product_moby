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

      // Mark code as used
      if (codeData.maxUses === 1) {
        await codeDoc.ref.update({
          usedBy: userId,
          usedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

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
  code?: string;
  maxUses?: number;
  expiresAt?: string;
}

interface CreateBetaCodeResult {
  success: boolean;
  code: string;
  maxUses: number;
  expiresAt: string | null;
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
    const code: string =
      request.data.code?.toUpperCase() || generateRandomCode();
    const maxUses: number = request.data.maxUses || 1;
    const expiresAt: admin.firestore.Timestamp | null = request.data.expiresAt
      ? admin.firestore.Timestamp.fromDate(new Date(request.data.expiresAt))
      : null;

    // Validate code format
    if (!/^[A-Z0-9-]{4,20}$/.test(code)) {
      throw new HttpsError(
        "invalid-argument",
        "Code must be 4-20 characters (letters, numbers, hyphens only)"
      );
    }

    const db = admin.firestore();

    try {
      // 4. CHECK IF CODE ALREADY EXISTS
      const existingCode = await db
        .collection("betaCodes")
        .where("code", "==", code)
        .limit(1)
        .get();

      if (!existingCode.empty) {
        throw new HttpsError(
          "already-exists",
          `Beta code "${code}" already exists`
        );
      }

      // 5. CREATE THE CODE
      const newCodeData = {
        code: code,
        isActive: true,
        usedBy: null,
        usedAt: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: request.auth.uid,
        expiresAt: expiresAt,
        maxUses: maxUses,
      };

      await db.collection("betaCodes").add(newCodeData);

      console.log(`✅ Beta code created: ${code} by ${request.auth.uid}`);

      return {
        success: true,
        code: code,
        maxUses: maxUses,
        expiresAt: expiresAt?.toDate().toISOString() || null,
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
