"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { requestBetaAccess } from "@/lib/firebase/client/beta";

interface BetaAccessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BetaAccessRequestModal({
  isOpen,
  onClose,
}: BetaAccessRequestModalProps) {
  const [view, setView] = useState<"request" | "success">("request");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestAccess = async () => {
    try {
      setIsSubmitting(true);
      await requestBetaAccess();
      setView("success");
    } catch (error) {
      console.error("Failed to request beta access:", error);
      // You can add error handling here if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset to initial view after modal closes
    setTimeout(() => setView("request"), 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-5 top-5 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content container with fixed height for smooth animations */}
            <div className="relative h-[240px] bg-primary-light-alt">
              <AnimatePresence mode="wait">
                {view === "request" && (
                  <motion.div
                    key="request"
                    initial={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0 p-8 flex flex-col"
                  >
                    {/* Header */}
                    <h2 className="text-header-2 text-primary-dark mb-4">
                      Request Early Access?
                    </h2>

                    {/* Buttons */}
                    <div className="mt-auto space-y-3">
                      <button
                        onClick={handleRequestAccess}
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg bg-primary-dark text-white text-md font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          "Sending..."
                        ) : (
                          <>
                            Yes, I want access!{" "}
                            <span className="ml-1 text-xl">🙌</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="w-full py-3 rounded-lg border-2 border-gray-300 text-gray-700 text-md font-semibold hover:bg-white/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        No <span className="ml-0 text-lg">😔</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {view === "success" && (
                  <motion.div
                    key="success"
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute inset-0 p-8 flex flex-col"
                  >
                    {/* Header */}
                    <h2 className="text-header-2 text-primary-dark mb-4">
                      Request Received!{" "}
                      <span className="ml-1 text-[30px]">🎉</span>
                    </h2>

                    {/* Body */}
                    <p className="text-gray-600">
                      Thank you for your interest in our app!
                    </p>
                    <p className="text-gray-600 mb-8">
                      A member of our team will reach out to you shortly.
                    </p>

                    {/* Close button */}
                    <button
                      onClick={handleClose}
                      className="w-full mt-auto py-3 rounded-lg bg-primary-dark text-white font-semibold hover:opacity-90 transition-opacity"
                    >
                      Close
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
