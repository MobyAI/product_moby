"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  Ruler,
  Edit2,
  Save,
  X,
  FileText,
  Download,
  Ellipsis,
  ChevronLeft,
  ChevronRight,
  Upload,
  Star,
  ExternalLink,
  Flag,
  Trash,
  Mail,
} from "lucide-react";
import { auth } from "@/lib/firebase/client/config/app";
import { getUser, updateUserProfile } from "@/lib/firebase/client/user";
import {
  deleteHeadshot,
  deleteResume,
  getHeadshots,
  getResume,
  setAuthPhotoURL,
} from "@/lib/firebase/client/media";
import { useAuthUser } from "@/components/providers/UserProvider";
import { DashboardLayout, Button, LoadingScreen } from "@/components/ui";
import Dialog, { useDialog } from "@/components/ui/Dialog";
import { UserProfile, ethnicities } from "@/types/profile";
import HeadshotUploadModal from "./headshotUploadModal";
import ResumeUploadModal from "./resumeUploadModal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";
import { motion, AnimatePresence } from "framer-motion";

const ethnicityLabels = Object.fromEntries(
  ethnicities.map((eth) => [eth.value, eth.label])
);

function ProfilePageContent() {
  const [deleting, setDeleting] = useState<"headshot" | "resume" | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);
  const [showHeadshotUploadModal, setShowHeadshotUploadModal] = useState(false);
  const [showResumeUploadModal, setShowResumeUploadModal] = useState(false);
  const [selectedHeadshotIndex, setSelectedHeadshotIndex] = useState(0);

  // Animated menu button setup
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const router = useRouter();
  const { uid, photoURL } = useAuthUser();
  const userID = uid;
  const userPhotoURL = photoURL;
  const queryClient = useQueryClient();
  const { dialogProps, openConfirm } = useDialog();
  const { showToast } = useToast();

  // Query for profile data
  const { data: profile = null, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userID],
    queryFn: async () => {
      if (!userID) throw new Error("No user ID");
      const result = await getUser(userID);
      if (result.success && result.data) {
        // setEditedProfile(result.data);
        return result.data;
      }
      throw new Error(result.error || "Failed to load profile");
    },
    enabled: !!userID,
  });

  const { data: headshots = [], isLoading: headshotsLoading } = useQuery({
    queryKey: ["headshots", userID],
    queryFn: async () => {
      if (!userID) return [];
      const result = await getHeadshots(userID);
      return result.success ? result.data || [] : [];
    },
    enabled: !!userID,
  });

  const { data: resume = null, isLoading: resumeLoading } = useQuery({
    queryKey: ["resume", userID],
    queryFn: async () => {
      if (!userID) return null;
      const result = await getResume(userID);
      return result.success ? result.data : null;
    },
    enabled: !!userID,
  });

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
    }
  }, [profile]);

  // Combined loading state
  const loading = profileLoading || headshotsLoading || resumeLoading;

  async function handleSave() {
    if (!editedProfile) return;
    setSaving(true);

    try {
      const result = await updateUserProfile(editedProfile);
      if (!result.success) {
        throw new Error("Profile update returned unsuccessful");
      }

      await queryClient.invalidateQueries({ queryKey: ["profile", userID] });
      setEditMode(false);
      router.refresh();
    } catch (err) {
      Sentry.captureException(err);

      showToast({
        header: "Failed to save changes",
        line1: "Please try again",
        type: "danger",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditedProfile(profile);
    setEditMode(false);
  }

  async function handleDeleteHeadshot(headshotId: string) {
    openConfirm(
      "Delete Headshot",
      "Are you sure you want to delete this headshot? This action cannot be undone.",
      async () => {
        setDeleting("headshot");
        try {
          await deleteHeadshot(headshotId, auth.currentUser?.uid || "");
          if (selectedHeadshotIndex >= headshots.length - 1) {
            setSelectedHeadshotIndex(Math.max(0, headshots.length - 2));
          }
          await queryClient.invalidateQueries({
            queryKey: ["headshots", userID],
          });
        } catch (error) {
          console.error("Delete headshot error:", error);
          Sentry.captureException(error);

          showToast({
            header: "Failed to delete",
            line1: "Please try again",
            type: "danger",
          });
        } finally {
          setDeleting(null);
        }
      },
      { type: "delete" }
    );
  }

  async function handleDeleteResume() {
    openConfirm(
      "Delete Resume",
      "Are you sure you want to delete your resume? This action cannot be undone.",
      async () => {
        setDeleting("resume");
        try {
          await deleteResume(resume?.id || "", auth.currentUser?.uid || "");
          await queryClient.invalidateQueries({ queryKey: ["resume", userID] });
        } catch (error) {
          console.error("Delete resume error:", error);
          Sentry.captureException(error);

          showToast({
            header: "Failed to delete",
            line1: "Please try again",
            type: "danger",
          });
        } finally {
          setDeleting(null);
        }
      },
      { type: "delete" }
    );
  }

  async function handleSetProfilePic(url: string) {
    try {
      await setAuthPhotoURL(url);
      router.refresh();
    } catch (error) {
      Sentry.captureException(error);

      showToast({
        header: "Failed to update",
        line1: "Please try again",
        type: "danger",
      });
    }
  }

  const handleHeadshotUploadSuccess = async () => {
    setShowHeadshotUploadModal(false);

    showToast({
      header: "Upload success!",
      type: "success",
    });

    // Update display
    await queryClient.invalidateQueries({ queryKey: ["headshots", userID] });
    setSelectedHeadshotIndex(headshots.length); // Will be the new last index
  };

  const handleResumeUploadSuccess = async () => {
    setShowResumeUploadModal(false);

    showToast({
      header: "Upload success!",
      type: "success",
    });

    // Update display
    await queryClient.invalidateQueries({ queryKey: ["resume", userID] });
  };

  // Update button position when menu opens
  useEffect(() => {
    if (isMenuOpen && toggleButtonRef.current) {
      const rect = toggleButtonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
      });
      setShouldRender(true);
    }
  }, [isMenuOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  const menuButtons = shouldRender && (
    <div
      ref={menuRef}
      style={{
        position: "absolute",
        top: `${buttonPosition.top}px`,
        left: `${buttonPosition.left}px`,
        zIndex: 9999,
      }}
    >
      <AnimatePresence
        mode="wait"
        onExitComplete={() => setShouldRender(false)}
      >
        {isMenuOpen && (
          <>
            {/* Fullsize button - above to the left */}
            <motion.button
              key="fullsize-button"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: 1, x: -52, y: -28 }}
              exit={{ scale: 0, x: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.05,
              }}
              onClick={() =>
                window.open(
                  headshots[selectedHeadshotIndex]?.originalUrl,
                  "_blank",
                  "noopener,noreferrer"
                )
              }
              className="absolute p-3 rounded-full bg-[#363c54] shadow-xl hover:cursor-pointer text-white transition-colors z-10 group"
              aria-label={"View Fullsize"}
            >
              <ExternalLink className="w-5 h-5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-primary-dark-alt rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {"Fullsize"}
              </span>
            </motion.button>

            {/* Delete button - above and to the right */}
            <motion.button
              key="delete-button"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: 1, x: 52, y: -28 }}
              exit={{ scale: 0, x: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              onClick={() =>
                handleDeleteHeadshot(headshots[selectedHeadshotIndex].id)
              }
              className="absolute p-3 rounded-full bg-[#363c54] shadow-xl hover:cursor-pointer text-white transition-colors z-10 group"
              aria-label="Delete"
            >
              <Trash className="w-5 h-5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-primary-dark-alt rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Delete
              </span>
            </motion.button>

            {/* Favorite button - above */}
            <motion.button
              key="favorite-button"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: 1, x: 0, y: -56 }}
              exit={{ scale: 0, x: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0,
              }}
              onClick={() =>
                handleSetProfilePic(
                  headshots[selectedHeadshotIndex].thumbnailUrl
                )
              }
              className="absolute p-3 rounded-full bg-[#363c54] shadow-xl hover:cursor-pointer hover:bg-[#454d6b] text-white transition-colors z-10 group"
              aria-label="Set Profile Picture"
            >
              <Star
                className={`w-5 h-5 transition-all ${
                  userPhotoURL &&
                  headshots[selectedHeadshotIndex]?.thumbnailUrl ===
                    userPhotoURL
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-white"
                }`}
              />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-primary-dark-alt rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {userPhotoURL &&
                headshots[selectedHeadshotIndex]?.thumbnailUrl === userPhotoURL
                  ? "Current Profile Picture"
                  : "Set Profile Picture"}
              </span>
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  if (loading) {
    return (
      <LoadingScreen
        header="Profile Page"
        message="Getting your details"
        mode="light"
      />
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No profile found</p>
          <Button
            onClick={() => router.push("/onboarding")}
            size="md"
            variant="primary"
          />
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout maxWidth={100}>
      {/* Header */}
      <div className="bg-transparent rounded-lg mb-0">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-header text-primary-dark ml-5 mb-10">
              Hey, {profile.firstName}! 👋
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-[35%_65%] gap-9">
        {/* Left Column - Profile Picture & Headshots */}
        <div className="bg- relative">
          <div className="flex flex-col items-center mt-8">
            {/* Circular Headshot Picture */}
            <div className="relative w-90 h-90 rounded-full overflow-hidden bg-gray-100 mb-6">
              {headshots.length > 0 &&
              headshots[selectedHeadshotIndex]?.thumbnailUrl ? (
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
                  onClick={() =>
                    setSelectedHeadshotIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={selectedHeadshotIndex === 0}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-600 min-w-[60px] text-center">
                  {selectedHeadshotIndex + 1} of {headshots.length}
                </span>
                <button
                  onClick={() =>
                    setSelectedHeadshotIndex((prev) =>
                      Math.min(headshots.length - 1, prev + 1)
                    )
                  }
                  disabled={selectedHeadshotIndex === headshots.length - 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Headshot Actions */}
            {headshots.length > 0 ? (
              <div className="absolute top-2 right-8">
                <button
                  ref={toggleButtonRef}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className={`rounded-full hover:cursor-pointer transition-colors ${
                    isMenuOpen
                      ? "bg-white text-blac p-3"
                      : "text-black hover:bg-black/5 p-2"
                  }`}
                  aria-label={isMenuOpen ? "Close menu" : "Open menu"}
                >
                  {isMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Ellipsis className="w-6 h-6" />
                  )}
                </button>
              </div>
            ) : null}

            {/* Portal the menu buttons to document body */}
            {typeof document !== "undefined" &&
              createPortal(menuButtons, document.body)}

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
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">Maximum headshots uploaded</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - User Info & Demographics */}
        <div className="bg-transparent rounded-xl max-w-xl relative">
          {/* Edit Button */}
          <div className="absolute top-0 right-0">
            {!editMode ? (
              <Button
                onClick={() => {
                  setEditedProfile(profile);
                  setEditMode(true);
                }}
                size="sm"
                variant="primary"
                icon={Edit2}
                iconOnly={true}
              />
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="danger"
                  icon={X}
                  iconOnly={true}
                />
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-800 before:content-none shadow-md hover:shadow-lg"
                  icon={Save}
                  iconOnly={true}
                />
              </div>
            )}
          </div>

          <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
            {/* <User className="w-5 h-5 text-gray-500" /> */}
            Profile Information
          </h2>

          <div className="space-y-6">
            {/* Name Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <User className="w-4 h-4" />
                Name
              </label>
              {editMode ? (
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={editedProfile?.firstName || ""}
                    onChange={(e) =>
                      setEditedProfile((prev) =>
                        prev ? { ...prev, firstName: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={editedProfile?.lastName || ""}
                    onChange={(e) =>
                      setEditedProfile((prev) =>
                        prev ? { ...prev, lastName: e.target.value } : null
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
              ) : (
                <p className="text-gray-900 mb-4">
                  {profile.firstName} {profile.lastName}
                </p>
              )}
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <p className="text-gray-900">{profile.email}</p>
            </div>

            <div className="border-t border-gray-500/50 pt-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                {/* <Globe className="w-4 h-4 text-gray-500" /> */}
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
                    <>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={editedProfile?.age || 0}
                        onChange={(e) =>
                          setEditedProfile((prev) =>
                            prev
                              ? { ...prev, age: parseInt(e.target.value) }
                              : null
                          )
                        }
                        className="w-20 mr-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                      <span className="text-gray-600 text-sm">years old</span>
                    </>
                  ) : (
                    <p className="text-gray-900 py-2">
                      {profile.age} years old
                    </p>
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
                            const currentInches =
                              (editedProfile?.height || 0) % 12;
                            setEditedProfile((prev) =>
                              prev
                                ? { ...prev, height: feet * 12 + currentInches }
                                : null
                            );
                          }}
                          className="w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-gray-900"
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
                            const currentFeet = Math.floor(
                              (editedProfile?.height || 0) / 12
                            );
                            setEditedProfile((prev) =>
                              prev
                                ? { ...prev, height: currentFeet * 12 + inches }
                                : null
                            );
                          }}
                          className="w-14 px-2 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-gray-900"
                        />
                        <span className="text-gray-600 text-sm">in</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 py-2">
                      {`${Math.floor(profile.height / 12)}'${
                        profile.height % 12
                      }"`}
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
                          setEditedProfile((prev) => {
                            if (!prev) return null;
                            const ethnicities = prev.ethnicity.includes(value)
                              ? prev.ethnicity.filter((e) => e !== value)
                              : [...prev.ethnicity, value];
                            return { ...prev, ethnicity: ethnicities };
                          });
                        }}
                        className={`px-4 py-1 rounded-md text-sm transition-colors ${
                          editedProfile?.ethnicity.includes(value)
                            ? "bg-blue-500 text-white"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profile.ethnicity.map((eth) => (
                      <span
                        key={eth}
                        className="px-4 py-1 bg-gray-50 text-gray-800 text-sm rounded-md"
                      >
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
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
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
                        onClick={() =>
                          window.open(
                            resume.url,
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
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
                        icon={Trash}
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
        onSuccess={handleHeadshotUploadSuccess}
      />

      <ResumeUploadModal
        isOpen={showResumeUploadModal}
        onClose={() => setShowResumeUploadModal(false)}
        onSuccess={handleResumeUploadSuccess}
      />

      <Dialog {...dialogProps} />
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <LoadingScreen
          header="Profile Page"
          message="Getting your details"
          mode="light"
        />
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
