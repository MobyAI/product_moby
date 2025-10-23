"use client";

import { useAccess } from "@/components/providers/UserProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
          title: "Access Required",
          message: "You need a beta code or subscription to access this app.",
          actionText: "Enter Beta Code",
          actionHref: "/beta-code",
        };
      default:
        return {
          title: "Access Required",
          message: "You need active access to use this app.",
          actionText: "Get Access",
          actionHref: "/beta-code",
        };
    }
  };

  const content = getModalContent();

  const handleClose = () => {
    // Redirect to login when closing
    router.push("/login");
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      {/* Modal */}
      <div className="bg-primary-light-alt rounded-2xl p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <h2 className="text-header-2 text-primary-dark">{content.title}</h2>
            <p className="text-gray-600 mt-2">{content.message}</p>
          </div>

          <button
            onClick={handleClose}
            className="p-5 transition-colors duration-200 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Icon */}
        <div className="bg-white/50 py-10 px-8 rounded-xl mb-6 flex justify-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 border-t border-gray-100 pt-6">
          <button
            onClick={handleClose}
            className="flex-1 px-6 py-3 border border-primary-dark-alt text-primary-dark-alt rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
          <button
            onClick={() => router.push(content.actionHref)}
            className="flex-1 bg-primary-dark-alt text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {content.actionText}
          </button>
        </div>
      </div>
    </div>
  );
}
