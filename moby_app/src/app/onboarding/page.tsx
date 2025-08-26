"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, User, Ruler, Calendar, Globe } from "lucide-react";
import { addUser } from "@/lib/firebase/client/user";

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

function OnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const finalDestination = searchParams.get("next") || "/home";

    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState<UserProfile>({
        firstName: "",
        lastName: "",
        age: 25,
        ethnicity: "",
        height: 170,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [heightUnit, setHeightUnit] = useState<"cm" | "ft">("cm");

    const totalSteps = 4;

    async function handleProfileSubmit() {
        if (!profile.firstName || !profile.lastName) {
            setError("Please enter your full name");
            return;
        }

        try {
            setLoading(true);
            const res = await addUser(profile);
            if (res.success) {
                router.replace(finalDestination);
            } else {
                setError(res.error || "Failed to save profile");
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Failed to save profile.");
            }
        } finally {
            setLoading(false);
        }
    }

    const convertHeight = (cm: number, toUnit: "cm" | "ft"): string => {
        if (toUnit === "cm") return `${cm} cm`;
        const totalInches = cm / 2.54;
        const feet = Math.floor(totalInches / 12);
        const inches = Math.round(totalInches % 12);
        return `${feet}'${inches}"`;
    };

    return (
        <div className="min-h-screen grid place-items-center p-6">
            <div className="w-full max-w-md">
                <div className="space-y-6">
                    {/* Header Message */}
                    <div className="text-center space-y-1 pb-4">
                        <h1 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Complete Your Profile
                        </h1>
                        <p className="text-md text-gray-500">
                            Tell us a little about yourself before getting started!
                        </p>
                    </div>

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

                    {/* Step 1: Name */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto">
                                    <User className="w-8 h-8 text-purple-600" />
                                </div>
                                <h2 className="text-2xl font-semibold">{"What's your name?"}</h2>
                            </div>
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="First name"
                                    value={profile.firstName}
                                    onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && profile.firstName && profile.lastName && setStep(2)}
                                    className="w-full rounded-xl border-2 px-4 py-3 text-lg focus:border-purple-500 focus:outline-none transition-colors"
                                    autoFocus
                                />
                                <input
                                    type="text"
                                    placeholder="Last name"
                                    value={profile.lastName}
                                    onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                    onKeyDown={(e) => e.key === 'Enter' && profile.firstName && profile.lastName && setStep(2)}
                                    className="w-full rounded-xl border-2 px-4 py-3 text-lg focus:border-purple-500 focus:outline-none transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => profile.firstName && profile.lastName && setStep(2)}
                                disabled={!profile.firstName || !profile.lastName}
                                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4 inline ml-2" />
                            </button>
                        </div>
                    )}

                    {/* Step 2: Age */}
                    {step === 2 && (
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
                                    onClick={() => setStep(1)}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium hover:shadow-lg transition-all"
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4 inline ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Ethnicity */}
                    {step === 3 && (
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
                                    onClick={() => setStep(2)}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={() => profile.ethnicity && setStep(4)}
                                    disabled={!profile.ethnicity}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4 inline ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Height */}
                    {step === 4 && (
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
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={handleProfileSubmit}
                                    disabled={loading}
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
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen grid place-items-center p-6">
                <div className="w-full max-w-md">
                    <div className="text-center">
                        <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        }>
            <OnboardingContent />
        </Suspense>
    );
}