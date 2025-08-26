"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, User, Ruler, Calendar, Globe } from "lucide-react";

type Props = {
    mode: "login" | "signup";
    onGoogle: () => Promise<void>;
    onEmailPassword: (email: string, password: string) => Promise<void>;
    onProfileComplete?: (profile: UserProfile) => Promise<void>;
    switchHref: string;
    switchText: string;
    switchCta: string;
};

type UserProfile = {
    firstName: string;
    lastName: string;
    age: number;
    ethnicity: string;
    height: number; // in cm
};

const ethnicities = [
    { value: "asian", label: "Asian", emoji: "🌐" },
    { value: "black", label: "Black/African", emoji: "🌐" },
    { value: "hispanic", label: "Hispanic/Latino", emoji: "🌐" },
    { value: "middle-eastern", label: "Middle Eastern", emoji: "🌐" },
    { value: "native", label: "Native/Indigenous", emoji: "🌐" },
    { value: "pacific", label: "Pacific Islander", emoji: "🌐" },
    { value: "white", label: "White/Caucasian", emoji: "🌐" },
    { value: "mixed", label: "Mixed/Multiple", emoji: "🌐" },
    { value: "other", label: "Other", emoji: "✨" },
    { value: "prefer-not", label: "Prefer not to say", emoji: "🤐" },
];

export default function Form({
    mode,
    onGoogle,
    onEmailPassword,
    onProfileComplete,
    switchHref,
    switchText,
    switchCta,
}: Props) {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState("");
    const [pw, setPw] = useState("");
    const [profile, setProfile] = useState<UserProfile>({
        firstName: "",
        lastName: "",
        age: 25,
        ethnicity: "",
        height: 170,
    });
    const [loading, setLoading] = useState<null | "google" | "email" | "profile">(null);
    const [error, setError] = useState<string | null>(null);
    const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");

    const totalSteps = mode === "signup" ? 5 : 1;

    async function submitEmail(e: React.FormEvent | React.KeyboardEvent) {
        e.preventDefault();
        setError(null);
        if (!email || !pw) {
            setError("Email and password are required.");
            return;
        }
        try {
            setLoading("email");
            await onEmailPassword(email, pw);
            if (mode === "signup") {
                setStep(2);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Sign in failed.");
            }
        } finally {
            setLoading(null);
        }
    }

    async function submitGoogle() {
        setError(null);
        try {
            setLoading("google");
            await onGoogle();
            if (mode === "signup") {
                setStep(2);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Google sign in failed.");
            }
        } finally {
            setLoading(null);
        }
    }

    async function handleProfileSubmit() {
        if (!profile.firstName || !profile.lastName) {
            setError("Please enter your full name");
            return;
        }

        try {
            setLoading("profile");

            if (onProfileComplete) {
                await onProfileComplete(profile);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to save profile.");
            }
        } finally {
            setLoading(null);
        }
    }

    const convertHeight = (cm: number, toUnit: "cm" | "ft"): string => {
        if (toUnit === "cm") return `${cm} cm`;
        const totalInches = cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${feet}'${inches}"`;
    };

    const title = mode === "login" ? "Sign in" : "Create your account";

    if (mode === "signup" && step > 1) {
        return (
            <div className="space-y-6 w-full max-w-md mx-auto">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Step {step} of {totalSteps}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(step / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Step 2: Name */}
                {step === 2 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                                <User className="w-8 h-8 text-purple-600" />
                            </div>
                            <h2 className="text-2xl font-semibold">What's your name?</h2>
                            <p className="text-gray-500">Let's get to know you better</p>
                        </div>
                        <div className="space-y-2">
                            <input
                                type="text"
                                placeholder="First name"
                                value={profile.firstName}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && profile.firstName && profile.lastName && setStep(3)}
                                className="w-full rounded-xl border-2 px-4 py-3 text-lg focus:border-purple-500 focus:outline-none transition-colors"
                                autoFocus
                            />
                            <input
                                type="text"
                                placeholder="Last name"
                                value={profile.lastName}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                onKeyDown={(e) => e.key === 'Enter' && profile.firstName && profile.lastName && setStep(3)}
                                className="w-full rounded-xl border-2 px-4 py-3 text-lg focus:border-purple-500 focus:outline-none transition-colors"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => profile.firstName && profile.lastName && setStep(3)}
                                disabled={!profile.firstName || !profile.lastName}
                                className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4 inline ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Age */}
                {step === 3 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto">
                                <Calendar className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-semibold">How old are you?</h2>
                            <p className="text-gray-500">Slide to select your age</p>
                        </div>
                        <div className="space-y-4">
                            <div className="text-center">
                                <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                                    {profile.age}
                                </div>
                                <div className="text-gray-500 mt-1">years old</div>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="100"
                                value={profile.age}
                                onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(147, 51, 234) ${((profile.age - 1) / 99) * 100}%, rgb(229, 231, 235) ${((profile.age - 1) / 99) * 100}%, rgb(229, 231, 235) 100%)`
                                }}
                            />
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>1</span>
                                <span>100</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={() => setStep(4)}
                                className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium hover:shadow-lg transition-all"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4 inline ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Ethnicity */}
                {step === 4 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center mx-auto">
                                <Globe className="w-8 h-8 text-orange-600" />
                            </div>
                            <h2 className="text-2xl font-semibold">Your background</h2>
                            <p className="text-gray-500">Select the option that best describes you</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                            {ethnicities.map((eth) => (
                                <button
                                    key={eth.value}
                                    onClick={() => setProfile({ ...profile, ethnicity: eth.value })}
                                    className={`p-4 rounded-xl border-2 transition-all ${profile.ethnicity === eth.value
                                        ? "border-purple-500 bg-purple-50 shadow-md"
                                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                        }`}
                                >
                                    <div className="text-2xl mb-2">{eth.emoji}</div>
                                    <div className={`text-sm font-medium ${profile.ethnicity === eth.value ? "text-purple-700" : "text-gray-700"
                                        }`}>
                                        {eth.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(3)}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={() => profile.ethnicity && setStep(5)}
                                disabled={!profile.ethnicity}
                                className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4 inline ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Height */}
                {step === 5 && (
                    <div className="space-y-6 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <div className="w-16 h-16 bg-gradient-to-br from-pink-100 to-red-100 rounded-full flex items-center justify-center mx-auto">
                                <Ruler className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-semibold">How tall are you?</h2>
                            <p className="text-gray-500">Slide to set your height</p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-center gap-2">
                                <button
                                    onClick={() => setHeightUnit("cm")}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${heightUnit === "cm"
                                        ? "bg-purple-500 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                >
                                    cm
                                </button>
                                <button
                                    onClick={() => setHeightUnit("ft")}
                                    className={`px-4 py-2 rounded-lg font-medium transition-all ${heightUnit === "ft"
                                        ? "bg-purple-500 text-white"
                                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                        }`}
                                >
                                    inches
                                </button>
                            </div>
                            <div className="text-center">
                                <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                                    {convertHeight(profile.height, heightUnit)}
                                </div>
                            </div>
                            <input
                                type="range"
                                min="120"
                                max="220"
                                value={profile.height}
                                onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) })}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                style={{
                                    background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(147, 51, 234) ${((profile.height - 120) / 100) * 100}%, rgb(229, 231, 235) ${((profile.height - 120) / 100) * 100}%, rgb(229, 231, 235) 100%)`
                                }}
                            />
                            <div className="flex justify-between text-sm text-gray-500">
                                <span>{heightUnit === "cm" ? "120 cm" : "3'11\""}</span>
                                <span>{heightUnit === "cm" ? "220 cm" : "7'3\""}</span>
                            </div>
                        </div>
                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(4)}
                                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                Back
                            </button>
                            <button
                                onClick={handleProfileSubmit}
                                disabled={loading !== null}
                                className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 font-medium hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? "Saving..." : "Complete Profile"}
                                <Check className="w-4 h-4 inline ml-2" />
                            </button>
                        </div>
                    </div>
                )}

                <style jsx>{`
                    @keyframes fadeIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    .animate-fadeIn {
                        animation: fadeIn 0.3s ease-out;
                    }
                    .slider::-webkit-slider-thumb {
                        appearance: none;
                        width: 24px;
                        height: 24px;
                        background: white;
                        border: 3px solid rgb(147, 51, 234);
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    }
                    .slider::-moz-range-thumb {
                        width: 24px;
                        height: 24px;
                        background: white;
                        border: 3px solid rgb(147, 51, 234);
                        border-radius: 50%;
                        cursor: pointer;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">{title}</h1>

            <div className="flex justify-center">
                <button
                    className="gsi-material-button"
                    style={{ width: 300 }}
                    onClick={submitGoogle}
                    disabled={loading !== null}
                >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                        <div className="gsi-material-button-icon">
                            <svg
                                version="1.1"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 48 48"
                                xmlnsXlink="http://www.w3.org/1999/xlink"
                                style={{ display: "block" }}
                            >
                                <path
                                    fill="#EA4335"
                                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0
          14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5
          24 9.5z"
                                />
                                <path
                                    fill="#4285F4"
                                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94
          c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6
          c4.51-4.18 7.09-10.36 7.09-17.65z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19
          C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6
          c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98
          6.19C6.51 42.62 14.62 48 24 48z"
                                />
                                <path fill="none" d="M0 0h48v48H0z" />
                            </svg>
                        </div>
                        <span className="gsi-material-button-contents">Continue with Google</span>
                        <span style={{ display: "none" }}>Continue with Google</span>
                    </div>
                </button>
            </div>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">or</span>
                </div>
            </div>

            <form onSubmit={submitEmail} className="space-y-3">
                <input
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitEmail(e)}
                    className="w-full rounded-md border px-3 py-2"
                />
                <input
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    placeholder="Password"
                    value={pw}
                    onChange={(e) => setPw(e.currentTarget.value)}
                    onKeyDown={(e) => e.key === 'Enter' && submitEmail(e)}
                    className="w-full rounded-md border px-3 py-2"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <button
                    type="submit"
                    disabled={loading !== null}
                    className="w-full rounded-lg bg-black text-white px-4 py-2"
                >
                    {loading === "email"
                        ? mode === "login"
                            ? "Signing in…"
                            : "Creating account…"
                        : mode === "login"
                            ? "Sign in with email"
                            : "Create account"}
                </button>
            </form>

            <p className="text-sm text-gray-600">
                {switchText}{" "}
                <a href={switchHref} className="underline">
                    {switchCta}
                </a>
            </p>
        </div>
    );
}