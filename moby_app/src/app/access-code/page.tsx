"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/client/config/app";
import { sendSessionLogin, handleLogout } from "@/lib/api/auth";
import { MoveRight } from "lucide-react";
import BetaAccessRequestModal from "./requestModal";

interface RedeemBetaCodeResult {
  success: boolean;
  message: string;
  expiresAt: string;
  daysGranted: number;
}

export default function BetaCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!code || code.trim().length < 4) {
      setError("Please enter a valid beta code");
      return;
    }

    try {
      setLoading(true);

      const functions = getFunctions();
      const redeemFn = httpsCallable(functions, "redeemBetaCode");

      const result = await redeemFn({ code: code.toUpperCase().trim() });
      const data = result.data as RedeemBetaCodeResult;

      console.log("✅ Beta access granted:", data);

      // Force token refresh and update session cookie
      const user = auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken(true);

        // Create new session cookie with updated claims
        const sessionResult = await sendSessionLogin(idToken);

        if (!sessionResult.success) {
          throw new Error(sessionResult.error || "Failed to refresh session");
        }
      }

      // Now redirect - server will read the new session cookie with updated claims
      router.push("/tracker");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("❌ Error redeeming code:", err);

      // Extract the actual error message from Firebase Functions error
      let errorMessage = "Invalid beta code. Please check and try again.";

      if (err?.code && err?.message) {
        // Firebase Functions error - extract just the message part
        errorMessage = err.message.replace(/^[^:]+:\s*/, ""); // Remove "functions/xxx: " prefix
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const result = await handleLogout();

    if (result.success) {
      router.push("/login");
    } else {
      console.error("❌ Logout failed:", result.error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="w-25 h-25 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
          <div
            className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
            style={{ animationDuration: "1.5s" }}
          ></div>
        </div>
        <p className="text-header-2 text-primary-dark">
          Activating your access...
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Logo */}
      <h3 className="text-logo text-primary-dark z-50 absolute top-4 left-5">
        odee
      </h3>

      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="text-start space-y-4">
          <h1 className="text-header text-primary-dark">
            Welcome to Odee!
          </h1>
          <p className="text-gray-600">
            Enter your exclusive code to get early access
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              id="access-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER-CODE-HERE"
              className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400 text-center text-lg font-mono tracking-wider uppercase"
              autoComplete="off"
              autoFocus
              maxLength={20}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.trim().length < 8}
            className="w-full flex items-center justify-center py-3 rounded-lg bg-primary-dark-alt font-semibold text-white transition-colors hover:opacity-90 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Activate
            <MoveRight className="w-5 h-5 ml-2" />
          </button>
        </form>

        {/* Footer */}
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-primary-light-alt text-gray-500">
                Need help?
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            {"Don't have a code? "}
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-primary-dark underline font-medium hover:cursor-pointer hover:text-gray-500"
            >
              Request access
            </button>
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="text-sm text-primary-dark underline hover:cursor-pointer hover:text-gray-500"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Modal */}
      <BetaAccessRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
