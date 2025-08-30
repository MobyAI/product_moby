"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Check, User, Ruler, Calendar, Globe, Camera, FileText, Upload } from "lucide-react";
import { uploadHeadshot, uploadResume } from "@/lib/firebase/client/media";
import { addUser } from "@/lib/firebase/client/user";
import { auth } from "@/lib/firebase/client/config/app";
import { UserProfile, ethnicities } from "@/types/profile";

// For auth shell use
export const requireProfile = false;

type LoadingState = "idle" | "headshot" | "resume" | "profile";

function OnboardingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    // const finalDestination = searchParams.get("next") || "/home";
    const finalDestination = searchParams.get("next") || "/scripts/list";
    const totalSteps = 6;

    const [step, setStep] = useState(1);
    const [profile, setProfile] = useState<UserProfile>({
        firstName: "",
        lastName: "",
        age: 25,
        ethnicity: [],
        height: 66,
    });
    const [loading, setLoading] = useState<LoadingState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [isDraggingHeadshot, setIsDraggingHeadshot] = useState(false);
    const [isDraggingResume, setIsDraggingResume] = useState(false);

    async function handleProfileSubmit() {
        if (!profile.firstName || !profile.lastName) {
            setError("Please enter your full name");
            return;
        }

        try {
            setLoading("profile");
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
            setLoading("idle");
        }
    }

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
                                <p className="text-gray-500">Select all that apply</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                                {ethnicities.map((eth) => (
                                    <button
                                        key={eth.value}
                                        onClick={() => {
                                            setProfile(prev => ({
                                                ...prev,
                                                ethnicity: prev.ethnicity.includes(eth.value)
                                                    ? prev.ethnicity.filter(e => e !== eth.value)
                                                    : [...prev.ethnicity, eth.value]
                                            }));
                                        }}
                                        className={`p-4 rounded-xl border-2 transition-all ${profile.ethnicity.includes(eth.value)
                                            ? "border-purple-500 bg-purple-50 shadow-md"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                            }`}
                                    >
                                        <div className="text-2xl mb-2">{eth.emoji}</div>
                                        <div className={`text-sm font-medium ${profile.ethnicity.includes(eth.value) ? "text-purple-700" : "text-gray-700"
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
                                    onClick={() => profile.ethnicity.length > 0 && setStep(4)}
                                    disabled={profile.ethnicity.length === 0}
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
                                <div className="text-center">
                                    <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                                        {`${Math.floor(profile.height / 12)}'${profile.height % 12}"`}
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="36"  // inches
                                    max="96"  // inches
                                    value={profile.height}
                                    onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) })}
                                    className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                                    style={{
                                        background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(147, 51, 234) ${((profile.height - 36) / 60) * 100}%, rgb(229, 231, 235) ${((profile.height - 36) / 60) * 100}%, rgb(229, 231, 235) 100%)`
                                    }}
                                />
                                <div className="flex justify-between text-sm text-gray-500">
                                    <span>{`3'0"`}</span>
                                    <span>{`8'0"`}</span>
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
                                    onClick={() => profile.height && setStep(5)}
                                    disabled={!profile.height}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4 inline ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Headshot */}
                    {step === 5 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto">
                                    <Camera className="w-8 h-8 text-indigo-600" />
                                </div>
                                <h2 className="text-2xl font-semibold">Upload Your Headshot</h2>
                                <p className="text-gray-500">Professional photo for your profile</p>
                            </div>

                            <div className="space-y-4">
                                {loading === "headshot" ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <div className="w-24 h-24 mx-auto mb-6 relative">
                                            <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin"></div>
                                            <div className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }}></div>
                                        </div>
                                        <p className="text-gray-600">Processing your headshot...</p>
                                    </div>
                                ) : (
                                    <label
                                        className="block"
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDraggingHeadshot(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            setIsDraggingHeadshot(false);
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            setIsDraggingHeadshot(false);

                                            const file = e.dataTransfer.files?.[0];
                                            if (file && file.type.startsWith('image/')) {
                                                setLoading("headshot");
                                                setError(null);
                                                try {
                                                    const result = await uploadHeadshot(file, auth.currentUser?.uid || '');
                                                    if (!result.success) {
                                                        setError(result.error || 'Upload failed');
                                                    }
                                                    setStep(6);
                                                } catch {
                                                    setError('Failed to upload headshot');
                                                } finally {
                                                    setLoading("idle");
                                                }
                                            } else {
                                                setError('Please upload an image file');
                                            }
                                        }}
                                    >
                                        <div className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingHeadshot
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                            }`}>
                                            <Upload className={`w-10 h-10 mb-3 ${isDraggingHeadshot ? 'text-purple-500' : 'text-gray-400'}`} />
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">Click to upload or drag and drop</span>
                                            </p>
                                            <p className="text-xs text-gray-500">PNG, JPG up to 15MB</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setLoading("headshot");
                                                    setError(null);
                                                    try {
                                                        const result = await uploadHeadshot(file, auth.currentUser?.uid || '');
                                                        if (!result.success) {
                                                            setError(result.error || 'Upload failed');
                                                        }
                                                        setStep(6);
                                                    } catch {
                                                        setError('Failed to upload headshot');
                                                    } finally {
                                                        setLoading("idle");
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            {error && <p className="text-sm text-red-600 text-center">Upload failed. Try again?</p>}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(4)}
                                    disabled={loading === "headshot"}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(6)}
                                    disabled={loading === "headshot"}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Skip for now
                                    <ChevronRight className="w-4 h-4 inline ml-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Resume */}
                    {step === 6 && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto">
                                    <FileText className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-2xl font-semibold">Upload Your Resume</h2>
                                <p className="text-gray-500">PDF or DOCX format</p>
                            </div>

                            <div className="space-y-4">
                                {loading === "resume" ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <div className="w-24 h-24 mx-auto mb-6 relative">
                                            <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin"></div>
                                            <div className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }}></div>
                                        </div>
                                        <p className="text-gray-600">Processing your resume...</p>
                                    </div>
                                ) : loading === "profile" ? (
                                    <div className="flex flex-col items-center justify-center h-64">
                                        <div className="w-24 h-24 mx-auto mb-6 relative">
                                            <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin"></div>
                                            <div className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }}></div>
                                        </div>
                                        <p className="text-gray-600">Saving your profile...</p>
                                    </div>
                                ) : (
                                    <label
                                        className="block"
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDraggingResume(true);
                                        }}
                                        onDragLeave={(e) => {
                                            e.preventDefault();
                                            setIsDraggingResume(false);
                                        }}
                                        onDrop={async (e) => {
                                            e.preventDefault();
                                            setIsDraggingResume(false);

                                            const file = e.dataTransfer.files?.[0];
                                            if (file && (file.type === 'application/pdf' ||
                                                file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) {
                                                setLoading("resume");
                                                setError(null);
                                                try {
                                                    const result = await uploadResume(file, auth.currentUser?.uid || '');
                                                    if (!result.success) {
                                                        setError('Upload failed');
                                                    }
                                                    handleProfileSubmit();
                                                } catch {
                                                    setError('Failed to upload resume');
                                                } finally {
                                                    setLoading("idle");
                                                }
                                            } else {
                                                setError('Please upload a PDF or DOCX file');
                                            }
                                        }}
                                    >
                                        <div className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDraggingResume
                                            ? 'border-emerald-500 bg-emerald-50'
                                            : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                            }`}>
                                            <Upload className={`w-10 h-10 mb-3 ${isDraggingResume ? 'text-emerald-500' : 'text-gray-400'}`} />
                                            <p className="mb-2 text-sm text-gray-500">
                                                <span className="font-semibold">Click to upload or drag and drop</span>
                                            </p>
                                            <p className="text-xs text-gray-500">PDF or DOCX up to 25MB</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setLoading("resume");
                                                    setError(null);
                                                    try {
                                                        const result = await uploadResume(file, auth.currentUser?.uid || '');
                                                        if (!result.success) {
                                                            setError('Upload failed');
                                                        }
                                                        handleProfileSubmit();
                                                    } catch {
                                                        setError('Failed to upload resume');
                                                    } finally {
                                                        setLoading("idle");
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                )}
                            </div>

                            {error && <p className="text-sm text-red-600 text-center">Upload failed. Try again?</p>}

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep(5)}
                                    disabled={loading === "resume"}
                                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <button
                                    onClick={handleProfileSubmit}
                                    disabled={loading === "resume"}
                                    className="flex-1 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading === "profile" ? "Saving..." : "Complete Profile"}
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
        </div >
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