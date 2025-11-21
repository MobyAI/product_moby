"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase/client/config/app";
import { handleLogout, sendSessionLogin } from "@/lib/api/auth";
import { Mail, RefreshCw, Clock } from "lucide-react";

export default function VerifyEmailNoticePage() {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(auth.currentUser);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  // Update user state when auth changes
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        router.push("/login");
      }

      if (currentUser?.emailVerified) {
        router.push("/tracker");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Countdown timer effect
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setCountdown(retryAfter);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setRetryAfter(null);
            setMessage("");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [retryAfter]);

  // Format seconds into readable time
  const formatTime = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours > 1 ? "s" : ""}${
        mins > 0 ? ` ${mins} min` : ""
      }`;
    } else if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins} min${mins > 1 ? "s" : ""} ${secs} sec`;
    } else {
      return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    }
  };

  const handleResendEmail = async () => {
    if (!user || (retryAfter && retryAfter > 0)) return;

    try {
      setSending(true);
      setMessage("");

      const response = await fetch("/api/email/verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retrySeconds = data.retryAfter || 900;
          setRetryAfter(retrySeconds);
          setMessage(
            `Too many attempts. Please try again in ${formatTime(
              retrySeconds
            )}.`
          );
        } else {
          throw new Error(data.error || "Failed to send verification email");
        }
        return;
      }

      setMessage("✅ Verification email sent! Check your inbox.");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Resend email error:", error);
      setMessage(error.message || "Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleCheckVerification = async () => {
    if (!user) return;

    try {
      setChecking(true);
      setMessage("");

      await user.reload();

      if (user.emailVerified) {
        const idToken = await user.getIdToken(true);
        const result = await sendSessionLogin(idToken);

        if (result.success) {
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

        {/* Rate Limit Banner */}
        {retryAfter && retryAfter > 0 && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-orange-900 mb-1">
                  Too Many Attempts
                </h3>
                <p className="text-sm text-red-800 mb-2">
                  For security reasons, please wait before trying again.
                </p>
                <div className="flex items-center space-x-2">
                  <div className="text-base font-bold text-red-900 tabular-nums">
                    {formatTime(countdown)}
                  </div>
                  <span className="text-sm text-red-700">remaining</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message */}
        {message && !retryAfter && (
          <div
            className={`p-4 rounded-lg text-sm bg-gray-200 text-gray-700 text-left`}
          >
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
                <span>{`I've Verified My Email`}</span>
              </>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={sending || (retryAfter !== null && retryAfter > 0)}
            className="w-full py-3 rounded-lg border-2 border-gray-300 font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : "Resend Verification Email"}
          </button>

          {/* Help text when rate limited */}
          {retryAfter && retryAfter > 0 && (
            <p className="text-sm text-center text-gray-600">
              Need immediate help?{" "}
              <a
                href="mailto:support@odee.io"
                className="text-primary-dark underline font-medium"
              >
                Contact support
              </a>
            </p>
          )}
        </div>

        {/* Help Text */}
        <div className="pt-4 border-t border-gray-200 space-y-4">
          <p className="text-sm text-gray-600">
            {`Can't find the email? Check your spam folder or request a new one above.`}
          </p>

          <button
            onClick={handleSignOut}
            className="text-sm text-primary-dark font-medium underline hover:cursor-pointer"
          >
            Sign out and use a different email
          </button>
        </div>
      </div>
    </div>
  );
}
