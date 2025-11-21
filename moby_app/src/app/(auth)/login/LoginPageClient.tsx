"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Check, ArrowLeft, Clock } from "lucide-react";
import {
  handleEmailPasswordLogin,
  handleGoogleLogin,
  sendSessionLogin,
} from "@/lib/api/auth";
import { checkUserProfileExists } from "@/lib/firebase/client/user";
import { updatePassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";

type Step = "login" | "password-setup" | "forgot-password";

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length < 255;
}

export default function LoginPageClient() {
  const search = useSearchParams();
  const router = useRouter();
  const next = search.get("next") || "/tracker";

  const [step, setStep] = useState<Step>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number>(0);

  async function handleSuccessfulLogin() {
    const hasProfile = await checkUserProfileExists();

    if (!hasProfile) {
      router.replace(`/onboarding?next=${encodeURIComponent(next)}`);
    } else {
      router.replace(next);
    }
  }

  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const res = await handleEmailPasswordLogin(email, password);
      if (res.success) {
        await handleSuccessfulLogin();
      } else {
        throw new Error("Email/password sign-in failed.");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(
        err.message || "Failed to sign in. Please check your credentials."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);

      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);

        // Refresh the session cookie after password update
        const newIdToken = await user.getIdToken(true);
        const sessionResult = await sendSessionLogin(newIdToken);

        if (sessionResult.success) {
          await handleSuccessfulLogin();
        } else {
          throw new Error("Failed to refresh session after password update");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to set password.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await handleGoogleLogin();

      if (!res.success) {
        if (res.error?.includes("popup-closed-by-user")) {
          setLoading(false);
          return;
        }
        throw new Error(res.error || "Google sign-in failed.");
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        // Check if password provider exists
        const hasPassword = currentUser.providerData.some(
          (p) => p.providerId === "password"
        );

        if (!hasPassword) {
          // Show password setup form
          setEmail(currentUser.email || "");
          setStep("password-setup");
          setLoading(false);
          return;
        }
      }

      // User has password, continue to app
      await handleSuccessfulLogin();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
      console.error(err);
      setLoading(false);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (retryAfter && retryAfter > 0) {
      setCountdown(retryAfter);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setRetryAfter(null);
            setError("");
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Enhanced validation with isValidEmail
    if (!email || !isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Don't allow submission if rate limited
    if (retryAfter && retryAfter > 0) {
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/email/password-reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle rate limit specifically
        if (response.status === 429) {
          const retrySeconds = data.retryAfter || 900; // Default to 15 minutes if not provided
          setRetryAfter(retrySeconds);
          setError(
            `Too many attempts. Please try again in ${formatTime(
              retrySeconds
            )}.`
          );
        } else {
          throw new Error(data.error || "Failed to send reset email");
        }
        return;
      }

      setResetEmailSent(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    const loadingMessage =
      step === "password-setup"
        ? "Setting up your account!"
        : step === "forgot-password"
        ? "Sending reset link..."
        : "Signing you in!";

    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        {/* Animated Logo/Icon */}
        <div className="w-25 h-25 mx-auto mb-8 relative">
          <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
          <div
            className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
            style={{ animationDuration: "1.5s" }}
          ></div>
        </div>
        <p className="text-header-2 text-primary-dark">{loadingMessage}</p>
      </div>
    );
  }

  if (step === "forgot-password") {
    if (resetEmailSent) {
      return (
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Success State */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-12 h-12 text-green-600" />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-header-2 text-primary-dark">
                Check Your Email
              </h1>
              <p className="text-gray-600">
                We sent a password reset link to{" "}
                <span className="font-medium">{email}</span>
              </p>
              <p className="text-gray-600 text-sm">
                Click the link in the email to reset your password.
              </p>
            </div>

            <div className="pt-4">
              <button
                onClick={() => {
                  setStep("login");
                  setResetEmailSent(false);
                  setEmail("");
                }}
                className="text-sm text-primary-dark hover:underline"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <button
            onClick={() => {
              setStep("login");
              setError("");
              setRetryAfter(null);
              setCountdown(0);
            }}
            className="text-gray-600 hover:text-gray-900 flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Login</span>
          </button>

          <div className="space-y-2">
            <h1 className="text-header text-primary-dark">Reset Password</h1>
            <p className="text-gray-600">
              {`Enter your email address and we'll send you a link to reset your password.`}
            </p>
          </div>
        </div>

        {/* Rate Limit Banner */}
        {retryAfter && retryAfter > 0 && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start space-x-3">
              <Clock className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
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

        {/* Forgot Password Form */}
        <form onSubmit={handleForgotPassword} className="space-y-6">
          <div>
            <label
              htmlFor="reset-email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
              autoComplete="email"
              autoFocus
              disabled={retryAfter !== null && retryAfter > 0}
            />
          </div>

          {error && !retryAfter && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || (retryAfter !== null && retryAfter > 0)}
            className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          {/* Help text */}
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
        </form>
      </div>
    );
  }

  if (step === "password-setup") {
    return (
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary-dark">
            Set up password access
          </h1>
          <p className="text-gray-600">
            {`You're signed in with Google using ${email}. Set a password to also
            enable email sign-in.`}
          </p>
        </div>

        {/* Password Form */}
        <form onSubmit={handlePasswordSetupSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Create a strong password"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
              autoComplete="new-password"
              autoFocus
            />

            {/* Password requirements */}
            <div className="mt-3 space-y-2">
              <div
                className={`flex items-center space-x-2 text-sm ${
                  newPassword.length >= 6 ? "text-green-600" : "text-gray-500"
                }`}
              >
                <Check
                  className={`w-4 h-4 ${
                    newPassword.length >= 6 ? "opacity-100" : "opacity-40"
                  }`}
                />
                <span>At least 6 characters</span>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90"
          >
            Set Password
          </button>

          <button
            type="button"
            onClick={async () => {
              setLoading(true);
              await handleSuccessfulLogin();
            }}
            className="w-full text-sm text-gray-600 underline hover:text-gray-900"
          >
            Skip for now
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-8">
      {/* Header */}
      <div className="text-start space-y-2">
        <h1 className="text-header text-primary-dark">{`Welcome back! 👋`}</h1>
      </div>

      {/* Forms */}
      <div className="space-y-4">
        {/* Email/Password Form */}
        <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
              autoComplete="current-password"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90"
          >
            Sign In
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setStep("forgot-password")}
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Forgot password?
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-primary-light-alt text-gray-500">or</span>
          </div>
        </div>

        {/* Google Button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="w-full py-3 px-4 rounded-lg border-1 border-gray-300 bg-white hover:bg-gray-50 font-semibold text-gray-700 transition-colors flex items-center justify-center space-x-3"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          <span>Sign in with Google</span>
        </button>
      </div>

      {/* Footer */}
      <div className="text-center space-y-4">
        <p className="text-sm text-gray-600">
          {"Don't have an account? "}
          <a
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="text-primary-dark underline font-medium"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}
