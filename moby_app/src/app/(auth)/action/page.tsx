"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";
import { Check, ArrowRight, AlertCircle } from "lucide-react";

type ActionMode = "resetPassword" | "verifyEmail" | "recoverEmail";
type Status = "loading" | "success" | "error" | "form";

interface PasswordRequirements {
  minLength: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
  hasNumeric: boolean;
}

export default function AuthActionHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode") as ActionMode;
  const oobCode = searchParams.get("oobCode");
  const continueUrl = searchParams.get("continueUrl");

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  // Password reset form state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password validation
  const passwordRequirements = useMemo((): PasswordRequirements => {
    return {
      minLength: newPassword.length >= 8,
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      hasUpperCase: /[A-Z]/.test(newPassword),
      hasNumeric: /[0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const isPasswordValid = useMemo(() => {
    return Object.values(passwordRequirements).every((req) => req);
  }, [passwordRequirements]);

  const passwordsMatch = newPassword === confirmPassword && newPassword !== "";

  // Handle email verification
  const handleVerifyEmail = async () => {
    if (!oobCode) {
      setStatus("error");
      setError("Invalid verification link");
      return;
    }

    try {
      await applyActionCode(auth, oobCode);
      setStatus("success");

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push(continueUrl || "/tracker");
      }, 2000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setStatus("error");
      if (error.code === "auth/invalid-action-code") {
        setError("This link has expired or has already been used");
      } else if (error.code === "auth/expired-action-code") {
        setError("This verification link has expired");
      } else {
        setError("Failed to verify email. Please try again.");
      }
    }
  };

  // Verify password reset code is valid
  const verifyResetCode = async () => {
    if (!oobCode) {
      setStatus("error");
      setError("Invalid reset link");
      return;
    }

    try {
      const userEmail = await verifyPasswordResetCode(auth, oobCode);
      setEmail(userEmail);
      setStatus("form");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setStatus("error");
      if (error.code === "auth/invalid-action-code") {
        setError("This link has expired or has already been used");
      } else if (error.code === "auth/expired-action-code") {
        setError("This password reset link has expired");
      } else {
        setError("Invalid password reset link");
      }
    }
  };

  // Handle password reset submission
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setError("Please meet all password requirements");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (!oobCode) {
      setError("Invalid reset link");
      return;
    }

    try {
      setStatus("loading");
      await confirmPasswordReset(auth, oobCode, newPassword);
      setStatus("success");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push("/login");
      }, 2000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setStatus("form");
      if (error.code === "auth/weak-password") {
        setError("Password is too weak");
      } else if (error.code === "auth/invalid-action-code") {
        setError("This link has expired. Please request a new password reset.");
      } else {
        setError("Failed to reset password. Please try again.");
      }
    }
  };

  // Initialize based on mode
  useEffect(() => {
    if (!mode || !oobCode) {
      setStatus("error");
      setError("You probably reached this page by accident");
      return;
    }

    if (mode === "verifyEmail") {
      handleVerifyEmail();
    } else if (mode === "resetPassword") {
      verifyResetCode();
    } else if (mode === "recoverEmail") {
      // Handle email recovery if needed
      setStatus("error");
      setError("Email recovery is not yet supported");
    } else {
      setStatus("error");
      setError("Unknown action type");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, oobCode]);

  // Loading State
  if (status === "loading") {
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
        <p className="text-header-2 text-primary-dark">
          {mode === "verifyEmail" && "Verifying your email..."}
          {mode === "resetPassword" && "Verifying reset link..."}
          {mode === "recoverEmail" && "Processing request..."}
        </p>
      </div>
    );
  }

  // Success State
  if (status === "success") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="space-y-8 text-center">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-12 h-12 text-green-600" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-3">
            <h1 className="text-header text-primary-dark">
              {mode === "verifyEmail" && "Email Verified!"}
              {mode === "resetPassword" && "Password Reset Complete!"}
            </h1>
            <p className="text-gray-600">
              {mode === "verifyEmail" &&
                "Your email has been successfully verified. Redirecting you now..."}
              {mode === "resetPassword" &&
                "Your password has been successfully updated. Redirecting to login..."}
            </p>
          </div>

          {/* Manual redirect button */}
          <button
            onClick={() =>
              router.push(
                mode === "verifyEmail" ? continueUrl || "/tracker" : "/login"
              )
            }
            className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90 flex items-center justify-center space-x-2"
          >
            <span>
              {mode === "verifyEmail" ? "Go to Dashboard" : "Go to Login"}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Error State
  if (status === "error") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="space-y-8 text-center">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="w-25 h-25 bg-gray-200 rounded-full flex items-center justify-center">
              <AlertCircle className="w-15 h-15 text-gray-700" />
            </div>
          </div>

          {/* Error Message */}
          <div className="space-y-3">
            <h1 className="text-header text-primary-dark">
              {mode === "verifyEmail" && "Verification Failed"}
              {mode === "resetPassword" && "Reset Link Invalid"}
              {!mode && "Invalid Request"}
            </h1>
            <p className="text-gray-600">{error}</p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {mode === "verifyEmail" && (
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90"
              >
                Go to Login
              </button>
            )}
            {mode === "resetPassword" && (
              <button
                onClick={() => router.push("/forgot-password")}
                className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90"
              >
                Request New Reset Link
              </button>
            )}
            {!mode && (
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90"
              >
                Go to Home
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Password Reset Form
  if (status === "form" && mode === "resetPassword") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-start space-y-2">
            <h1 className="text-header text-primary-dark">Reset Password</h1>
            <p className="text-gray-600">for {email}</p>
          </div>

          {/* Password Form */}
          <form onSubmit={handlePasswordReset} className="space-y-6">
            {/* New Password */}
            <div>
              <label
                htmlFor="new-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create a strong password"
                className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
                autoComplete="new-password"
                autoFocus
              />

              {/* Password requirements */}
              <div className="mt-3 space-y-2">
                <div
                  className={`flex items-center space-x-2 text-sm ${
                    passwordRequirements.minLength
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 ${
                      passwordRequirements.minLength
                        ? "opacity-100"
                        : "opacity-40"
                    }`}
                  />
                  <span>At least 8 characters</span>
                </div>
                <div
                  className={`flex items-center space-x-2 text-sm ${
                    passwordRequirements.hasUpperCase
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 ${
                      passwordRequirements.hasUpperCase
                        ? "opacity-100"
                        : "opacity-40"
                    }`}
                  />
                  <span>At least 1 uppercase letter</span>
                </div>
                <div
                  className={`flex items-center space-x-2 text-sm ${
                    passwordRequirements.hasNumeric
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 ${
                      passwordRequirements.hasNumeric
                        ? "opacity-100"
                        : "opacity-40"
                    }`}
                  />
                  <span>At least 1 number</span>
                </div>
                <div
                  className={`flex items-center space-x-2 text-sm ${
                    passwordRequirements.hasSpecialChar
                      ? "text-green-600"
                      : "text-gray-500"
                  }`}
                >
                  <Check
                    className={`w-4 h-4 ${
                      passwordRequirements.hasSpecialChar
                        ? "opacity-100"
                        : "opacity-40"
                    }`}
                  />
                  <span>At least 1 special character</span>
                </div>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
                autoComplete="new-password"
              />

              {/* Password match indicator */}
              {confirmPassword && (
                <div className="mt-2">
                  {passwordsMatch ? (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      <span>Passwords match</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                      <span className="w-4 h-4 flex items-center justify-center">
                        ✗
                      </span>
                      <span>Passwords do not match</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!isPasswordValid || !passwordsMatch}
              className="w-full py-3 rounded-lg bg-primary-dark font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Password
            </button>
          </form>

          {/* Back to login */}
          <div className="text-center">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-primary-dark hover:underline"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
