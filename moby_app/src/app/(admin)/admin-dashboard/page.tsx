"use client";

import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/client/config/app";

// ============================================================================
// TYPES
// ============================================================================

interface UserData {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  disabled: boolean;
  metadata: {
    creationTime: string;
    lastSignInTime: string;
  };
  providerData: Array<{
    providerId: string;
    uid: string;
    displayName: string | null;
    email: string | null;
    phoneNumber: string | null;
    photoURL: string | null;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customClaims?: Record<string, any>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeAgo(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AdminDashboardPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const functions = getFunctions();

  useEffect(() => {
    checkAdminAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      await loadUsers();
    } catch (error) {
      console.error("Error checking admin status:", error);
      alert("Failed to verify admin status");
    }
  };

  const loadUsers = async () => {
    try {
      const getAllUsers = httpsCallable(functions, "getAllUsers");
      const result = await getAllUsers();
      const data = result.data as { success: boolean; users: UserData[] };
      setUsers(data.users);
    } catch (error: unknown) {
      console.error("Error loading users:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      alert(`Failed to load users: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600">
            You must be an admin to view this page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading users...</div>
      </div>
    );
  }

  const verifiedUsers = users.filter((u) => u.emailVerified).length;
  const unverifiedUsers = users.filter((u) => !u.emailVerified).length;
  // const disabledUsers = users.filter((u) => u.disabled).length;
  const googleUsers = users.filter((u) =>
    u.providerData.some((p) => p.providerId === "google.com")
  ).length;
  const adminUsers = users.filter((u) => u.customClaims?.admin).length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">All Users</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Total Users</div>
          <div className="text-3xl font-bold text-blue-600">{users.length}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Verified</div>
          <div className="text-3xl font-bold text-green-600">
            {verifiedUsers}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Unverified</div>
          <div className="text-3xl font-bold text-yellow-600">
            {unverifiedUsers}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Admins</div>
          <div className="text-3xl font-bold text-purple-600">{adminUsers}</div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-sm text-gray-500 mb-1">Google Auth</div>
          <div className="text-3xl font-bold text-blue-600">{googleUsers}</div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">User Directory</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Admin
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  Last Sign In
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                  UID
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.uid} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {user.photoURL ? (
                        <img
                          src={user.photoURL}
                          alt={user.displayName || "User"}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center mr-3">
                          <span className="text-white font-semibold text-sm">
                            {user.email?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.displayName || "No name"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                        {user.phoneNumber && (
                          <div className="text-xs text-gray-400">
                            {user.phoneNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.emailVerified ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">
                          Unverified
                        </span>
                      )}
                      {user.disabled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                          Disabled
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.customClaims?.admin ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        ⚡ Admin
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {user.providerData.map((provider, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          {provider.providerId === "google.com" && "Google"}
                          {provider.providerId === "password" &&
                            "Email/Password"}
                          {provider.providerId === "phone" && "Phone"}
                          {!["google.com", "password", "phone"].includes(
                            provider.providerId
                          ) && provider.providerId}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(user.metadata.creationTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(user.metadata.creationTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {formatDate(user.metadata.lastSignInTime)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(user.metadata.lastSignInTime)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-mono text-gray-500 max-w-[150px] truncate">
                      {user.uid}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No users found in the system.
          </div>
        )}
      </div>
    </div>
  );
}
