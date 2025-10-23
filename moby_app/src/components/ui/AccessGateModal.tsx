"use client";

import { useAccess } from "@/components/providers/UserProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { handleLogout } from "@/lib/api/auth";
import { X, Lock } from "lucide-react";

export function AccessGateModal() {
  const access = useAccess();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Only show modal if we have access info and user doesn't have access
    if (access && !access.hasAccess) {
      setShowModal(true);
    } else {
      setShowModal(false);
    }
  }, [access]);

  if (!showModal || !access) return null;

  const getModalContent = () => {
    switch (access.reason) {
      case "expired":
        return {
          title: "Beta Access Expired",
          message:
            "Your beta access period has ended. Upgrade to continue using the app.",
          actionText: "Upgrade Now",
          actionHref: "/upgrade",
        };
      case "no_access":
        return {
          title: "Access Restricted",
          message:
            "You need a valid beta code or subscription to access this app.",
          actionText: "Enter Beta Code",
          actionHref: "/beta-code",
        };
      default:
        return {
          title: "Access Restricted",
          message:
            "You need a valid beta code or subscription to access this app.",
          actionText: "Get Access",
          actionHref: "/beta-code",
        };
    }
  };

  const content = getModalContent();

  const handleClose = async () => {
    const result = await handleLogout();

    if (result.success) {
      router.push("/login");
    } else {
      console.error("❌ Logout failed:", result.error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      {/* Modal */}
      <div className="bg-primary-light-alt rounded-2xl p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-header-2 text-primary-dark inline-flex items-center gap-2">
              <span className="inline-flex text-red-400">
                <Lock className="w-7 h-7" strokeWidth={3} />
              </span>
              {content.title}
            </h2>
            <p className="text-gray-600 mt-2">{content.message}</p>
          </div>

          <button
            onClick={handleClose}
            className="p-5 transition-colors duration-200 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 border-t border-gray-100 pt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-primary-dark-alt text-primary-dark-alt rounded-lg font-medium hover:bg-white/50 transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={() => router.push(content.actionHref)}
            className="flex-1 bg-black text-white px-6 py-3 rounded-lg font-medium hover:opacity-80 transition-opacity"
          >
            {content.actionText}
          </button>
        </div>
      </div>
    </div>
  );
}
