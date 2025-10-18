"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  handleEmailPasswordRegister,
  handleGoogleLogin,
  sendSessionLogin,
} from "@/lib/api/auth";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client/config/app";

type Step = "email" | "password";

interface PasswordRequirements {
  minLength: boolean;
  hasSpecialChar: boolean;
  hasUpperCase: boolean;
  hasNumeric: boolean;
}

export default function SignupPage() {
  const search = useSearchParams();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const next = search.get("next") || "/tracker";
  const onboardingUrl = `/onboarding?next=${encodeURIComponent(next)}`;

  // Password validation
  const passwordRequirements = useMemo((): PasswordRequirements => {
    return {
      minLength: password.length >= 8,
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      hasUpperCase: /[A-Z]/.test(password),
      hasNumeric: /[0-9]/.test(password),
    };
  }, [password]);

  const isPasswordValid = useMemo(() => {
    return Object.values(passwordRequirements).every((req) => req);
  }, [passwordRequirements]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setStep("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isPasswordValid) {
      setError("Please meet all password requirements");
      return;
    }

    try {
      setLoading(true);

      if (isGoogleUser) {
        // User signed up with Google, now adding password
        const user = auth.currentUser;
        if (user) {
          await updatePassword(user, password);

          // Refresh the session cookie after password update
          const newIdToken = await user.getIdToken(true);
          const sessionResult = await sendSessionLogin(newIdToken);

          if (sessionResult.success) {
            router.replace(onboardingUrl);
          } else {
            throw new Error("Failed to refresh session after password update");
          }
        }
      } else {
        // Regular email/password signup
        const res = await handleEmailPasswordRegister(email, password);
        if (res.success) {
          router.replace(onboardingUrl);
        } else {
          throw new Error(res.error);
        }
      }
    } catch (err) {
      setError("Failed to create account. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await handleGoogleLogin();

      if (!res.success) {
        if (res.error?.includes("popup-closed-by-user")) {
          return;
        }
        throw new Error(res.error || "Failed to sign up with Google");
      }

      const currentUser = auth.currentUser;
      if (currentUser) {
        setEmail(currentUser.email || "");
        setIsGoogleUser(true);
        setStep("password");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
        <p className="text-header-2 text-primary-dark">
          {step === "password" ? "Creating your account!" : "Signing you in!"}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {step === "email" ? (
        <div className="space-y-8">
          {/* Header */}
          <div className="text-start space-y-2">
            <h1 className="text-header text-primary-dark">Create an account</h1>
          </div>

          {/* Forms */}
          <div className="space-y-4">
            {/* Email Input */}
            <div className="space-y-4">
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
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit(e)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-lg bg-white border-0 border-gray-300 focus:border-primary-dark focus:outline-none text-gray-900 placeholder-gray-400"
                  autoComplete="email"
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                onClick={handleEmailSubmit}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-primary-dark-alt font-semibold text-white transition-colors flex items-center justify-center space-x-2 hover:opacity-90"
              >
                <span>Continue with Email</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-primary-light-alt text-gray-500">
                  or
                </span>
              </div>
            </div>

            {/* Google Button */}
            <button
              onClick={handleGoogleSignup}
              disabled={loading}
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
              <span>Sign up with Google</span>
            </button>
          </div>

          {/* Footer */}
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <a
                href={`/login?next=${encodeURIComponent(next)}`}
                className="text-primary-dark underline font-medium"
              >
                Log in
              </a>
            </p>
            <p className="text-xs text-gray-500 px-4">
              By continuing, you agree to the{" "}
              <a href="/terms" className="underline">
                Terms of Service
              </a>{" "}
              and acknowledge the{" "}
              <a href="/privacy" className="underline">
                Privacy Notice
              </a>
            </p>
          </div>
        </div>
      ) : (
        // Password Step
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <button
              onClick={() => {
                setStep("email");
                setError("");
                setPassword("");
                if (isGoogleUser) {
                  // If user came from Google, reset the flow
                  setIsGoogleUser(false);
                  setEmail("");
                }
              }}
              className="text-gray-600 hover:text-gray-900 flex items-center space-x-2"
            >
              <ArrowRight className="w-4 h-4 rotate-180" />
              <span className="text-sm">Back</span>
            </button>

            <div className="space-y-2">
              <h1 className="text-header-2 text-primary-dark">
                Create a password
              </h1>
              <p className="text-gray-500">
                {isGoogleUser
                  ? `Set a password for ${email} to enable email sign-in`
                  : `Almost there! Set a password for ${email}`}
              </p>
            </div>
          </div>

          {/* Password Form */}
          <div className="space-y-6">
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
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit(e)}
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

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              onClick={handlePasswordSubmit}
              disabled={loading || !isPasswordValid}
              className="w-full py-3 rounded-lg bg-primary-dark-alt font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
