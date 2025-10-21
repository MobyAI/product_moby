"use client";

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/client/config/app";
import { Copy } from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface BetaCodeData {
  code: string;
  isActive: boolean;
  usedBy: string | null;
  usedAt: any;
  createdAt: any;
  createdBy?: string;
  expiresAt: any;
  maxUses: number;
  usedCount?: number;
  usedByUsers?: string[];
}

interface BetaUser {
  uid: string;
  email: string | null;
  betaActivatedAt: any;
  betaExpiresAt: any;
  accessLevel: string;
  betaCode?: string;
}

// ============================================================================
// HELPER FUNCTIONS FOR DATE FORMATTING
// ============================================================================

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function convertTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();

  // Handle Firestore Timestamp
  if (timestamp.toDate) {
    return timestamp.toDate();
  }

  // Handle milliseconds
  if (typeof timestamp === "number") {
    return new Date(timestamp);
  }

  // Handle Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  return new Date();
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function BetaCodesAdminPage() {
  const [codes, setCodes] = useState<BetaCodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Create code form
  const [maxUses, setMaxUses] = useState(1);
  const [durationDays, setDurationDays] = useState(30);
  const [creating, setCreating] = useState(false);

  // Expanded code and users
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [codeUsers, setCodeUsers] = useState<Record<string, BetaUser[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<string | null>(null);

  // Copy feedback
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const functions = getFunctions();

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("You must be logged in");
        return;
      }

      const idTokenResult = await user.getIdTokenResult(true);
      const admin = idTokenResult.claims.admin === true;
      setIsAdmin(admin);

      if (!admin) {
        alert("Access denied: You must be an admin to view this page");
        return;
      }

      await loadCodes();
    } catch (error) {
      console.error("Error checking admin status:", error);
      alert("Failed to verify admin status");
    }
  };

  const loadCodes = async () => {
    try {
      const getAllBetaCodes = httpsCallable(functions, "getAllBetaCodes");
      const result = await getAllBetaCodes();
      const data = result.data as { success: boolean; codes: BetaCodeData[] };
      setCodes(data.codes);
    } catch (error: any) {
      console.error("Error loading codes:", error);
      alert(`Failed to load codes: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCode = async () => {
    if (maxUses < 1) {
      alert("Max uses must be at least 1");
      return;
    }

    if (durationDays < 0) {
      alert("Duration cannot be negative");
      return;
    }

    setCreating(true);
    try {
      const createBetaCode = httpsCallable(functions, "createBetaCode");
      const result = await createBetaCode({ maxUses, durationDays });
      const data = result.data as { success: boolean; code: string };

      await loadCodes();
      alert(`✅ Beta code created: ${data.code}`);

      // Reset form
      setMaxUses(1);
      setDurationDays(30);
    } catch (error: any) {
      console.error("Error creating code:", error);
      alert(`❌ Failed to create code: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const loadUsers = async (code: string) => {
    // If already loaded, just toggle
    if (codeUsers[code]) {
      setExpandedCode(expandedCode === code ? null : code);
      return;
    }

    setLoadingUsers(code);
    try {
      const getBetaCodeUsers = httpsCallable(functions, "getBetaCodeUsers");
      const result = await getBetaCodeUsers({ code });
      const data = result.data as { success: boolean; users: BetaUser[] };

      console.log("Loaded users for code:", code, data.users);

      setCodeUsers((prev) => ({ ...prev, [code]: data.users }));
      setExpandedCode(code);
    } catch (error: any) {
      console.error("Error loading users:", error);
      alert(`Failed to load users: ${error.message}`);

      // Show at least the user IDs from usedByUsers if cloud function fails
      const codeData = codes.find((c) => c.code === code);
      if (codeData?.usedByUsers && codeData.usedByUsers.length > 0) {
        const fallbackUsers = codeData.usedByUsers.map((uid) => ({
          uid,
          email: `User ID: ${uid}`,
          betaActivatedAt: null,
          betaExpiresAt: null,
          accessLevel: "unknown",
          betaCode: code,
        }));
        setCodeUsers((prev) => ({ ...prev, [code]: fallbackUsers }));
        setExpandedCode(code);
      }
    } finally {
      setLoadingUsers(null);
    }
  };

  const handleRevokeAccess = async (
    uid: string,
    email: string,
    code: string
  ) => {
    if (!confirm(`Are you sure you want to revoke beta access for ${email}?`)) {
      return;
    }

    try {
      const revokeBetaAccess = httpsCallable(functions, "revokeBetaAccess");
      await revokeBetaAccess({ uid });

      // Reload users for this code
      const getBetaCodeUsers = httpsCallable(functions, "getBetaCodeUsers");
      const result = await getBetaCodeUsers({ code });
      const data = result.data as { success: boolean; users: BetaUser[] };
      setCodeUsers((prev) => ({ ...prev, [code]: data.users }));

      // Reload all codes to update counts
      await loadCodes();

      alert("✅ Access revoked successfully!");
    } catch (error: any) {
      console.error("Error revoking access:", error);
      alert(`❌ Failed to revoke access: ${error.message}`);
    }
  };

  const handleDeleteCode = async (code: string, usedCount: number) => {
    const message =
      usedCount > 0
        ? `⚠️ Delete code "${code}"? This will revoke access for ${usedCount} user(s). This cannot be undone!`
        : `Delete code "${code}"? This cannot be undone!`;

    if (!confirm(message)) {
      return;
    }

    try {
      const deleteBetaCode = httpsCallable(functions, "deleteBetaCode");
      const result = await deleteBetaCode({ code });
      const data = result.data as { success: boolean; message: string };

      // Remove from local state
      setExpandedCode(null);
      setCodeUsers((prev) => {
        const newState = { ...prev };
        delete newState[code];
        return newState;
      });

      // Reload codes
      await loadCodes();

      alert(`✅ ${data.message}`);
    } catch (error: any) {
      console.error("Error deleting code:", error);
      alert(`❌ Failed to delete code: ${error.message}`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(text);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getBetaStatus = (user: BetaUser) => {
    if (!user.betaExpiresAt) {
      return { status: "No expiration", color: "text-gray-500" };
    }

    const expiresAt = convertTimestamp(user.betaExpiresAt);
    const now = new Date();

    if (expiresAt < now) {
      return { status: "Expired", color: "text-red-600" };
    }

    const daysRemaining = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      status: `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} remaining`,
      color: daysRemaining < 7 ? "text-yellow-600" : "text-green-600",
    };
  };

  const getCodeStatus = (code: BetaCodeData) => {
    if (!code.isActive) {
      return { status: "Inactive", color: "bg-gray-100 text-gray-800" };
    }

    const usedCount = code.usedCount || 0;
    if (usedCount >= code.maxUses) {
      return { status: "Fully Used", color: "bg-orange-100 text-orange-800" };
    }

    if (code.expiresAt) {
      const expiresAt = convertTimestamp(code.expiresAt);
      const now = new Date();

      if (expiresAt < now) {
        return { status: "Expired", color: "bg-red-100 text-red-800" };
      }
    }

    return { status: "Active", color: "bg-green-100 text-green-800" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading beta codes...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">Access Denied: Admin Only</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-header-2 text-primary-dark mb-8">Beta Code Management</h1>

      {/* Create New Code Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Create New Beta Code</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Max Uses
              <span className="text-gray-500 ml-1">
                (how many people can use it)
              </span>
            </label>
            <input
              type="number"
              min="1"
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Duration (Days)
              <span className="text-gray-500 ml-1">(0 = unlimited)</span>
            </label>
            <input
              type="number"
              min="0"
              value={durationDays}
              onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreateCode}
              disabled={creating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Code"}
            </button>
          </div>
        </div>
      </div>

      {/* Beta Codes List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Beta Codes ({codes.length})</h2>
        </div>

        <div className="divide-y">
          {codes.map((code) => {
            const status = getCodeStatus(code);
            const usedCount = code.usedCount || 0;
            const remainingUses = code.maxUses - usedCount;
            const userIdsList = code.usedByUsers || [];

            return (
              <div key={code.code} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(code.code)}
                          className="text-2xl flex items-center font-mono font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                          title="Click to copy"
                        >
                          {code.code}
                          <Copy className="w-4 h-4 ml-2" />
                        </button>
                        {copySuccess === code.code && (
                          <span className="text-sm text-green-600">
                            ✓ Copied!
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1">
                        <span
                          className={`px-2 py-1 text-xs rounded ${status.color}`}
                        >
                          {status.status}
                        </span>
                        {code.expiresAt && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                            Expires:{" "}
                            {formatDate(convertTimestamp(code.expiresAt))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => loadUsers(code.code)}
                      disabled={loadingUsers === code.code}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm disabled:opacity-50"
                    >
                      {loadingUsers === code.code
                        ? "Loading..."
                        : expandedCode === code.code
                        ? "Hide Users"
                        : `View Users (${usedCount})`}
                    </button>
                    <button
                      onClick={() => handleDeleteCode(code.code, usedCount)}
                      className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-md text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Uses:</span> {usedCount} /{" "}
                    {code.maxUses}
                    {remainingUses > 0 && (
                      <span className="text-green-600 ml-1">
                        ({remainingUses} left)
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    {code.createdAt &&
                      formatTimeAgo(convertTimestamp(code.createdAt))}
                  </div>
                  {code.usedAt && (
                    <div>
                      <span className="font-medium">First Used:</span>{" "}
                      {formatTimeAgo(convertTimestamp(code.usedAt))}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">User IDs:</span>{" "}
                    {userIdsList.length > 0 ? userIdsList.length : "None"}
                  </div>
                </div>

                {/* Users List */}
                {expandedCode === code.code && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="font-medium mb-3">Users with this code:</h3>

                    {userIdsList.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No users have used this code yet.
                      </p>
                    ) : !codeUsers[code.code] ? (
                      <div className="text-gray-500 text-sm">
                        Loading user details...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {codeUsers[code.code].map((user) => {
                          const userStatus = getBetaStatus(user);
                          return (
                            <div
                              key={user.uid}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                            >
                              <div className="flex-1">
                                <div className="font-medium">
                                  {user.email || `User: ${user.uid}`}
                                </div>
                                <div className="text-xs text-gray-400 font-mono">
                                  {user.uid}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Activated:{" "}
                                  {user.betaActivatedAt
                                    ? formatTimeAgo(
                                        convertTimestamp(user.betaActivatedAt)
                                      )
                                    : "Unknown"}
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span
                                  className={`text-sm font-medium ${userStatus.color}`}
                                >
                                  {userStatus.status}
                                </span>
                                {user.accessLevel === "beta" && (
                                  <button
                                    onClick={() =>
                                      handleRevokeAccess(
                                        user.uid,
                                        user.email || user.uid,
                                        code.code
                                      )
                                    }
                                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Debug info */}
                    {userIdsList.length > 0 && (
                      <details className="mt-4 text-xs text-gray-500">
                        <summary className="cursor-pointer">
                          Debug: Raw User IDs
                        </summary>
                        <div className="mt-2 p-2 bg-gray-100 rounded font-mono">
                          {userIdsList.join(", ")}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {codes.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No beta codes created yet. Create one above to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
