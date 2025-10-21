// scripts/setAdmin.ts
import * as dotenv from "dotenv";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

// Same initialization logic as your admin config
let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  privateKey = privateKey.replace(/^["']|["']$/g, "");
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }
}

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });

const adminAuth = getAuth(app);

// Get UIDs from environment variable (comma-separated)
const adminUidsString = process.env.NEXT_PUBLIC_ADMIN_UIDS || "";
const uids = adminUidsString
  .split(",")
  .map((uid) => uid.trim())
  .filter((uid) => uid.length > 0);

if (uids.length === 0) {
  console.error(
    "❌ No UIDs found in NEXT_PUBLIC_ADMIN_UIDS environment variable"
  );
  console.log(
    "Make sure .env.local contains: NEXT_PUBLIC_ADMIN_UIDS=uid1,uid2,uid3"
  );
  process.exit(1);
}

async function setAdmin(uid: string) {
  try {
    const user = await adminAuth.getUser(uid);
    const existingClaims = user.customClaims || {};

    await adminAuth.setCustomUserClaims(uid, {
      ...existingClaims,
      admin: true,
    });

    console.log(`✅ ${uid} (${user.email}) is now an admin!`);
    return { success: true, uid };
  } catch (error) {
    console.error(`❌ Error for ${uid}:`, error);
    return { success: false, uid };
  }
}

async function run() {
  console.log(`🚀 Setting ${uids.length} user(s) as admin...\n`);

  const results = await Promise.all(uids.map(setAdmin));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\n📊 Successful: ${successful} | Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
