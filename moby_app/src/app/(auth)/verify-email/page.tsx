"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client/config/app";
import { sendEmailVerification } from "firebase/auth";
import { handleLogout, sendSessionLogin } from "@/lib/api/auth";
import { Mail, RefreshCw } from "lucide-react";

export default function VerifyEmailNoticePage() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(auth.currentUser);

  // Update user state when auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);

      // If no user, redirect to login
      if (!currentUser) {
        router.push("/login");
      }

      // If email verified, redirect to tracker
      if (currentUser?.emailVerified) {
        router.push("/tracker");
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleResendEmail = async () => {
    if (!user) return;

    try {
      setSending(true);
      setMessage("");

      await sendEmailVerification(user, {
        url: window.location.origin + "/tracker",
      });

      setMessage("✅ Verification email sent! Check your inbox.");
    } catch (error: any) {
      console.error("Resend email error:", error);

      if (error.code === "auth/too-many-requests") {
        setMessage("Too many requests. Please wait a moment and try again.");
      } else {
        setMessage("Failed to send email. Please try again.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;

    try {
      setChecking(true);
      setMessage("");

      // Reload user to get fresh verification status
      await user.reload();

      if (user.emailVerified) {
        // Refresh the session using existing helper
        const idToken = await user.getIdToken(true);
        const result = await sendSessionLogin(idToken);

        if (result.success) {
          // Session refreshed, redirect to tracker
          router.push("/tracker");
        } else {
          setMessage("Error updating session. Please try again.");
        }
      } else {
        setMessage(
          "Email not verified yet. Please check your inbox and click the verification link."
        );
      }
    } catch (error) {
      console.error("Error checking verification:", error);
      setMessage("Error checking verification status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    const result = await handleLogout();

    if (result.success) {
      router.push("/login");
    } else {
      console.error("Logout failed:", result.error);
    }
  };

  // Show loading if no user yet
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="w-25 h-25 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
          <div
            className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin"
            style={{ animationDuration: "1.5s", animationDirection: "reverse" }}
          ></div>
        </div>
        <p className="text-header-2 text-primary-dark">Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-25 h-25 bg-gray-200 rounded-full flex items-center justify-center">
            <Mail className="w-15 h-15 text-gray-700" />
          </div>
        </div>

        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-header text-primary-dark">Verify Your Email</h1>
          <p className="text-gray-600">
            We sent a verification link to{" "}
            <span className="font-medium">{user.email}</span>
          </p>
          <p className="text-gray-600">
            Click the link in the email to verify your account and access Odee.
          </p>
        </div>

        {/* Message */}
        {message && (
          <div className={`p-4 rounded-lg text-sm bg-gray-200 text-gray-700`}>
            <p>{message}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={checking}
            className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checking ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5" />
                <span>I've Verified My Email</span>
              </>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={sending}
            className="w-full py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Resend Verification Email"}
          </button>
        </div>

        {/* Help Text */}
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <p className="text-sm text-gray-500">
            Can't find the email? Check your spam folder or request a new one
            above.
          </p>

          <button
            onClick={handleSignOut}
            className="text-sm text-primary-dark hover:underline"
          >
            Sign out and use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
