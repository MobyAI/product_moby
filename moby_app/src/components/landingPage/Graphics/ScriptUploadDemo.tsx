"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useAnimation } from "framer-motion";
import { Plus } from "lucide-react";

export default function ScriptUploadDemo() {
  const fileDragControls = useAnimation();
  const scriptBounceControls = useAnimation();
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const runAnimation = async () => {
      // Reset everything
      fileDragControls.set({ x: -250, y: -30, opacity: 0 });
      scriptBounceControls.set({
        x: 0,
        y: -50,
        scale: 0,
        rotate: -180,
        opacity: 0,
      });

      // File dragging in from left to Plus icon position
      await fileDragControls.start({
        x: 0,
        y: -50,
        opacity: 1,
        transition: {
          duration: 1.2,
          ease: [0.34, 1.56, 0.64, 1], // Bouncy easing
        },
      });

      // Small settle bounce
      await fileDragControls.start({
        y: [-53, -50],
        transition: {
          duration: 0.3,
          ease: "easeOut",
        },
      });

      // Hold for a moment
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Fade out file
      fileDragControls.start({
        opacity: 0,
        transition: { duration: 0.3 },
      });

      // Script appears and bounces at Plus icon position
      await scriptBounceControls.start({
        scale: [0, 1.1, 1],
        rotate: [-180, 5, 0],
        opacity: 1,
        y: -50,
        transition: {
          duration: 0.6,
          ease: "easeOut",
        },
      });

      // Hold the script
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Bounce out to the right
      await scriptBounceControls.start({
        x: 300,
        rotate: 30,
        scale: 0.5,
        opacity: 0,
        transition: {
          duration: 1,
          ease: [0.34, 1.56, 0.64, 1],
        },
      });

      // Wait before restarting
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Restart the animation
      setAnimationKey((prev) => prev + 1);
    };

    runAnimation();
  }, [animationKey, fileDragControls, scriptBounceControls]);

  return (
    <div className="w-full max-w-md xl:max-w-lg aspect-[1.5/1] xl:aspect-[2/1] bg-primary-light-alt rounded-xl overflow-hidden relative">
      {/* Container with padding */}
      <div className="h-full flex flex-col items-center justify-center relative">
        {/* Upload Drop Zone */}
        <div className="relative w-full max-w-md">
          <div className="border-2 border-dashed border-gray-300 hover:border-blue-300 rounded-lg p-8 bg-white/50 backdrop-blur-sm relative overflow-hidden">
            {/* Animated file being dragged in from left with pointer cursor */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <motion.div animate={fileDragControls} className="relative">
                {/* File icon being dragged - smaller */}
                <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="4"
                    y="2"
                    width="16"
                    height="20"
                    rx="2"
                    fill="#60a5fa"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                  <line
                    x1="8"
                    y1="8"
                    x2="16"
                    y2="8"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="12"
                    x2="16"
                    y2="12"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="16"
                    x2="13"
                    y2="16"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Pointer hand cursor - white filled with black stroke */}
                <Image
                  src="/cursor-pointer.png"
                  alt="Cursor pointer"
                  width={36}
                  height={36}
                  className="absolute bottom-0 right-0 translate-x-1/3 translate-y-1/3"
                />
              </motion.div>
            </div>

            {/* Animated script bouncing out to right */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <motion.div animate={scriptBounceControls}>
                <div className="relative">
                  {/* Script icon with filled background - smaller */}
                  <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="2"
                      width="16"
                      height="20"
                      rx="2"
                      fill="#10b981"
                      stroke="#059669"
                      strokeWidth="2"
                    />
                    <line
                      x1="8"
                      y1="7"
                      x2="16"
                      y2="7"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="8"
                      y1="11"
                      x2="16"
                      y2="11"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="8"
                      y1="15"
                      x2="13"
                      y2="15"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="18"
                      cy="6"
                      r="3"
                      fill="#fbbf24"
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                    />
                  </svg>
                  {/* Sparkles - much larger */}
                  <motion.svg
                    className="w-8 h-8 absolute -top-2 -right-2"
                    viewBox="0 0 24 24"
                    fill="#fbbf24"
                    animate={{
                      scale: [0, 1.3, 1, 1, 0],
                      rotate: [0, 30, 0, 20, 180],
                      opacity: [0, 1, 1, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: 2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 2.5,
                    }}
                  >
                    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
                  </motion.svg>
                  <motion.svg
                    className="w-7 h-7 absolute -bottom-2 -left-2"
                    viewBox="0 0 24 24"
                    fill="#fbbf24"
                    animate={{
                      scale: [0, 1.3, 1, 1, 0],
                      rotate: [0, 30, 0, 20, 180],
                      opacity: [0, 1, 1, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      delay: 2.2,
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatDelay: 2.5,
                    }}
                  >
                    <path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" />
                  </motion.svg>
                </div>
              </motion.div>
            </div>

            {/* Static content */}
            <div className="flex flex-col items-center gap-3 relative z-10">
              <Plus className="w-13 h-13 text-gray-500" />
              <p className="text-sm text-gray-600 font-medium text-center">
                Drag and drop file here
              </p>
              <motion.button
                type="button"
                className="inline-flex justify-center rounded-full bg-primary-dark px-6 py-2 text-sm font-medium text-white shadow-sm"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Browse Files
              </motion.button>
              <p className="text-xs text-gray-500">PDF or DOCX • Max 3MB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
