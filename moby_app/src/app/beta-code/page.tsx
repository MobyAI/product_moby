"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase/client/config/app";
import { Check } from "lucide-react";

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

      // Force token refresh to get new custom claims
      const user = auth.currentUser;
      if (user) {
        await user.getIdToken(true);
      }

      console.log("✅ Beta access granted:", data);

      // Redirect
      router.push("/tracker");
    } catch (err: unknown) {
      console.error("❌ Error redeeming code:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Invalid beta code. Please check and try again.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
    router.push("/login");
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
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Header */}
      <div className="text-start space-y-2">
        <h1 className="text-header text-primary-dark">
          Welcome to the Beta!
        </h1>
        <p className="text-gray-600">
          Enter your exclusive beta code to get started
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="beta-code"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Beta Access Code
          </label>
          <input
            id="beta-code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ENTER-CODE-HERE"
            className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400 text-center text-lg font-mono tracking-wider uppercase"
            autoComplete="off"
            autoFocus
            maxLength={20}
          />

          {/* Code requirements */}
          <div className="mt-3 space-y-2">
            <div
              className={`flex items-center space-x-2 text-sm ${
                code.trim().length >= 4 ? "text-green-600" : "text-gray-500"
              }`}
            >
              <Check
                className={`w-4 h-4 ${
                  code.trim().length >= 4 ? "opacity-100" : "opacity-40"
                }`}
              />
              <span>At least 4 characters</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || code.trim().length < 4}
          className="w-full py-3 rounded-lg bg-primary-dark-alt font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Activate Beta Access →
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
          <a
            href="mailto:support@yourapp.com"
            className="text-primary-dark underline font-medium"
          >
            Request access
          </a>
        </p>

        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm text-gray-600 underline hover:text-gray-900"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
