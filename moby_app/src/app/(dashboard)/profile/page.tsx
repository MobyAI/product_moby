"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    User,
    Calendar,
    Globe,
    Ruler,
    Edit2,
    Save,
    X,
    FileText,
    Download,
    Camera,
    ChevronLeft,
    ChevronRight,
    Upload,
    Star,
    ExternalLink,
    Flag,
    Trash2,
} from "lucide-react";
import { Timestamp, FieldValue } from "firebase/firestore";
import { auth } from "@/lib/firebase/client/config/app";
import { getUser, updateUserProfile } from "@/lib/firebase/client/user";
import { deleteHeadshot, deleteResume, getHeadshots, getResume, setAuthPhotoURL } from "@/lib/firebase/client/media";
import { useAuthUser } from "@/components/providers/UserProvider";
import { DashboardLayout, Button } from "@/components/ui";
import { UserProfile, ethnicities } from "@/types/profile";
import HeadshotUploadModal from "./headshotUploadModal";
import ResumeUploadModal from "./resumeUploadModal";

type HeadshotData = {
    id: string;
    originalUrl: string;
    thumbnailUrl: string;
    fileName: string;
    fileSize: number;
    uploadedAt: Timestamp | FieldValue;
};

type ResumeData = {
    id: string;
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Timestamp | FieldValue;
};

const ethnicityLabels = Object.fromEntries(
    ethnicities.map(eth => [eth.value, eth.label])
);

export default function ProfilePage() {
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<'headshot' | 'resume' | null>(null);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
    const [headshots, setHeadshots] = useState<HeadshotData[]>([]);
    const [showHeadshotUploadModal, setShowHeadshotUploadModal] = useState(false);
    const [resume, setResume] = useState<ResumeData | null>(null);
    const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);
    const [selectedHeadshotIndex, setSelectedHeadshotIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const router = useRouter();
    const { uid, photoURL } = useAuthUser();
    const userID = uid;
    const userPhotoURL = photoURL;

    useEffect(() => {
        if (!userID) return;
        loadUserData();
    }, [userID]); // eslint-disable-line react-hooks/exhaustive-deps

    async function loadUserData(selectLatestHeadshot = false) {
        try {
            if (!userID) {
                console.error('No user ID available');
                router.push('/login');
                return;
            }

            const userResult = await getUser(userID);
            if (userResult.success && userResult.data) {
                setProfile(userResult.data);
                setEditedProfile(userResult.data);
            } else {
                setError(userResult.error || 'Failed to load profile');
            }

            const headshotsResult = await getHeadshots(userID);
            if (headshotsResult.success) {
                const newHeadshots = headshotsResult.data || [];
                setHeadshots(newHeadshots);
                if (selectLatestHeadshot && newHeadshots.length > 0) {
                    setSelectedHeadshotIndex(newHeadshots.length - 1);
                }
            }

            const resumeResult = await getResume(userID);
            if (resumeResult.success) {
                setResume(resumeResult.data);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        if (!editedProfile) return;
        setSaving(true);
        setError(null);

        try {
            const result = await updateUserProfile(editedProfile);
            if (result.success) {
                setProfile(editedProfile);
                setEditMode(false);
                router.refresh();
            } else {
                setError(result.error || 'Failed to save profile');
            }
        } catch {
            setError('Failed to save profile');
        } finally {
            setSaving(false);
        }
    }

    function handleCancel() {
        setEditedProfile(profile);
        setEditMode(false);
        setError(null);
    }

    async function handleDeleteHeadshot(headshotId: string) {
        if (!confirm('Are you sure you want to delete this headshot?')) return;
        setDeleting('headshot');
        try {
            await deleteHeadshot(headshotId, auth.currentUser?.uid || '');
            if (selectedHeadshotIndex >= headshots.length - 1) {
                setSelectedHeadshotIndex(Math.max(0, headshots.length - 2));
            }
            await loadUserData();
        } catch (error) {
            console.error('Delete headshot error:', error);
            setError('Failed to delete headshot');
        } finally {
            setDeleting(null);
        }
    }

    async function handleDeleteResume() {
        if (!confirm('Are you sure you want to delete your resume?')) return;
        setDeleting('resume');
        try {
            await deleteResume(resume?.id || '', auth.currentUser?.uid || '');
            await loadUserData();
        } catch (error) {
            console.error('Delete resume error:', error);
            setError('Failed to delete resume');
        } finally {
            setDeleting(null);
        }
    }

    async function handleSetProfilePic(url: string) {
        try {
            await setAuthPhotoURL(url);
            router.refresh();
        } catch {
            setError("Failed to update profile picture.");
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 relative">
                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600 mb-4">No profile found</p>
                    <Button onClick={() => router.push('/onboarding')} size="md" variant="primary" />
                </div>
            </div>
        );
    }

    return (
        <DashboardLayout maxWidth={90}>
            {/* Header */}
            <div className="bg-transparent rounded-lg mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-header-2">Profile</h1>
                        <p className="text-xl text-gray-600 mt-1">Hey, {profile.firstName}! 👋</p>
                    </div>
                    {!editMode ? (
                        <Button onClick={() => setEditMode(true)} size="sm" variant="secondary" icon={Edit2}>
                            Edit
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button onClick={handleCancel} size="sm" variant="danger" icon={X}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSave}
                                size="sm"
                                className="bg-green-600 text-white hover:bg-green-800 before:content-none shadow-md hover:shadow-lg"
                                icon={Save}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    )}
                </div>
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}
            </div>

            {/* Main Content - Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Profile Picture & Headshots */}
                <div className="bg-transparent rounded-2xl border border-gray-500/50 p-8">
                    <div className="flex flex-col items-center">
                        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                            <Camera className="w-5 h-5 text-gray-500" />
                            Headshots
                        </h2>

                        {/* Circular Headshot Picture */}
                        <div className="relative w-80 h-80 rounded-full overflow-hidden bg-gray-100 mb-6 border-15 border-gray-300">
                            {headshots.length > 0 && headshots[selectedHeadshotIndex]?.thumbnailUrl ? (
                                <Image
                                    src={headshots[selectedHeadshotIndex].thumbnailUrl}
                                    alt="Profile"
                                    fill
                                    priority
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-16 h-16 text-gray-400" />
                                </div>
                            )}
                        </div>

                        {/* Headshot Navigation */}
                        {headshots.length > 1 && (
                            <div className="flex items-center gap-4 mb-4">
                                <button
                                    onClick={() => setSelectedHeadshotIndex(prev => Math.max(0, prev - 1))}
                                    disabled={selectedHeadshotIndex === 0}
                                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                                    {selectedHeadshotIndex + 1} of {headshots.length}
                                </span>
                                <button
                                    onClick={() => setSelectedHeadshotIndex(prev => Math.min(headshots.length - 1, prev + 1))}
                                    disabled={selectedHeadshotIndex === headshots.length - 1}
                                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {/* Headshot Actions */}
                        {headshots.length > 0 ? (
                            <div className="flex gap-2 mb-4">
                                <Button
                                    iconOnly={true}
                                    variant="secondary"
                                    size="md"
                                    icon={ExternalLink}
                                    onClick={() => window.open(headshots[selectedHeadshotIndex]?.originalUrl, "_blank", "noopener,noreferrer")}
                                    title="View Full Size"
                                />
                                <Button
                                    iconOnly={true}
                                    onClick={() => handleSetProfilePic(headshots[selectedHeadshotIndex].thumbnailUrl)}
                                    size="md"
                                    className={
                                        userPhotoURL && headshots[selectedHeadshotIndex]?.thumbnailUrl === userPhotoURL
                                            ? "bg-yellow-500 text-white hover:bg-yellow-600"
                                            : "bg-gray-400 text-white hover:bg-gray-500"
                                    }
                                    icon={Star}
                                    title="Set as Profile Picture"
                                />
                                <Button
                                    iconOnly={true}
                                    onClick={() => handleDeleteHeadshot(headshots[selectedHeadshotIndex].id)}
                                    size="md"
                                    icon={Trash2}
                                    variant="danger"
                                    title="Delete Headshot"
                                />
                            </div>
                        ) : null}

                        {/* Upload Button */}
                        {headshots.length < 3 && (
                            <Button
                                onClick={() => setShowHeadshotUploadModal(true)}
                                size="sm"
                                className="bg-blue-500 text-white hover:bg-blue-700 before:content-none shadow-md hover:shadow-lg"
                                icon={Upload}
                            >
                                Upload Headshot
                            </Button>
                        )}

                        {headshots.length === 3 && (
                            <div className="flex items-center gap-2 text-green-600">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">Maximum headshots uploaded</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column - User Info & Demographics */}
                <div className="bg-transparent rounded-2xl border border-gray-500/50 p-8">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-gray-500" />
                        Profile Information
                    </h2>

                    <div className="space-y-6">
                        {/* Name Section */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name
                                </label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={editedProfile?.firstName || ''}
                                        onChange={(e) => setEditedProfile(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 py-2">{profile.firstName}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name
                                </label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        value={editedProfile?.lastName || ''}
                                        onChange={(e) => setEditedProfile(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 py-2">{profile.lastName}</p>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-500/50 pt-6">
                            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                                <Globe className="w-4 h-4 text-gray-500" />
                                Demographics
                            </h2>

                            {/* Age and Height */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Age
                                    </label>
                                    {editMode ? (
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={editedProfile?.age || 0}
                                            onChange={(e) => setEditedProfile(prev => prev ? { ...prev, age: parseInt(e.target.value) } : null)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    ) : (
                                        <p className="text-gray-900 py-2">{profile.age} years old</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                        <Ruler className="w-4 h-4" />
                                        Height
                                    </label>
                                    {editMode ? (
                                        <div className="flex gap-2">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="4"
                                                    max="7"
                                                    value={Math.floor((editedProfile?.height || 0) / 12)}
                                                    onChange={(e) => {
                                                        const feet = parseInt(e.target.value) || 0;
                                                        const currentInches = (editedProfile?.height || 0) % 12;
                                                        setEditedProfile(prev => prev ? { ...prev, height: feet * 12 + currentInches } : null);
                                                    }}
                                                    className="w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                />
                                                <span className="text-gray-600 text-sm">ft</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="11"
                                                    value={(editedProfile?.height || 0) % 12}
                                                    onChange={(e) => {
                                                        const inches = parseInt(e.target.value) || 0;
                                                        const currentFeet = Math.floor((editedProfile?.height || 0) / 12);
                                                        setEditedProfile(prev => prev ? { ...prev, height: currentFeet * 12 + inches } : null);
                                                    }}
                                                    className="w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                />
                                                <span className="text-gray-600 text-sm">in</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-gray-900 py-2">
                                            {`${Math.floor(profile.height / 12)}'${profile.height % 12}"`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Ethnicity */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                    <Flag className="w-4 h-4" />
                                    Ethnicity
                                </label>
                                {editMode ? (
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(ethnicityLabels).map(([value, label]) => (
                                            <button
                                                key={value}
                                                onClick={() => {
                                                    setEditedProfile(prev => {
                                                        if (!prev) return null;
                                                        const ethnicities = prev.ethnicity.includes(value)
                                                            ? prev.ethnicity.filter(e => e !== value)
                                                            : [...prev.ethnicity, value];
                                                        return { ...prev, ethnicity: ethnicities };
                                                    });
                                                }}
                                                className={`px-3 py-1 rounded-full text-sm transition-colors ${editedProfile?.ethnicity.includes(value)
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {profile.ethnicity.map(eth => (
                                            <span key={eth} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                                                {ethnicityLabels[eth] || eth}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="border-t border-gray-500/50 pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-gray-500" />
                                    Resume
                                </h2>
                                {resume && (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm">Saved</span>
                                    </div>
                                )}
                            </div>

                            {deleting === "resume" ? (
                                <div className="flex flex-col items-center justify-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-4 relative">
                                        <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                                    </div>
                                    <p className="text-gray-600">Deleting resume...</p>
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-3">
                                    {resume ? (
                                        <>
                                            <Button
                                                onClick={() => window.open(resume.url, "_blank", "noopener,noreferrer")}
                                                size="sm"
                                                icon={Download}
                                                className="bg-blue-500 text-white hover:bg-blue-700 before:content-none shadow-md hover:shadow-lg"
                                            >
                                                Download Resume
                                            </Button>
                                            <Button
                                                iconOnly={true}
                                                onClick={handleDeleteResume}
                                                size="md"
                                                variant="danger"
                                                icon={Trash2}
                                            />
                                        </>
                                    ) : (
                                        <Button
                                            onClick={() => setShowResumeUploadModal(true)}
                                            size="sm"
                                            className="bg-blue-500 text-white hover:bg-blue-700 before:content-none shadow-md hover:shadow-lg"
                                            icon={Upload}
                                        >
                                            Upload Resume
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <HeadshotUploadModal
                isOpen={showHeadshotUploadModal}
                onClose={() => setShowHeadshotUploadModal(false)}
                onSuccess={() => {
                    setShowHeadshotUploadModal(false);
                    loadUserData(true);
                }}
            />

            <ResumeUploadModal
                isOpen={showResumeUploadModal}
                onClose={() => setShowResumeUploadModal(false)}
                onSuccess={() => {
                    setShowResumeUploadModal(false);
                    loadUserData();
                }}
            />
        </DashboardLayout>
    );
}