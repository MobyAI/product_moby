import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type StepItem = {
  title: string;
  body?: string;
  media: string;
  alt?: string;
};

export type HorizontalStepGuideProps = {
  steps: StepItem[];
  className?: string;
};

const slideVariants = {
  initial: { y: 40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -40, opacity: 0 },
};

export default function HorizontalStepGuide({
  steps,
  className,
}: HorizontalStepGuideProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = useMemo(() => steps[activeIndex], [steps, activeIndex]);
  const isVideo =
    current.media.endsWith(".mp4") || current.media.includes(".mp4?");

  return (
    <section
      className={`w-full mx-auto py-12 sm:py-16 ${className ?? ""}`}
      aria-roledescription="Step by step guide"
    >
      {/* Top: Step Numbers with Titles */}
      <div className="flex justify-center items-start gap-8 sm:gap-12 md:gap-30 mb-12 sm:mb-16 px-4">
        {steps.map((step, index) => {
          const isActive = index === activeIndex;
          const stepNumber = `0${index + 1}.`;

          return (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className="flex flex-col items-start gap-2 group cursor-pointer relative"
            >
              {/* Step Number */}
              <span
                className={`font-inter text-sm sm:text-base transition-colors duration-300 ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {stepNumber}
              </span>

              {/* Step Title */}
              <span
                className={`font-inter text-base sm:text-lg font-medium transition-colors duration-300 ${
                  isActive
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {step.title}
              </span>

              {/* Underline */}
              <motion.div
                className="h-0.5 bg-slate-900 dark:bg-white absolute -bottom-2 left-0"
                initial={{ width: 0 }}
                animate={{ width: isActive ? "100%" : 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              />
            </button>
          );
        })}
      </div>

      {/* Bottom: Content Area */}
      <div className="w-full max-w-7xl mx-auto px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`content-${activeIndex}`}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="space-y-6"
          >

            {/* Media */}
            <div className="w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {isVideo ? (
                  <motion.video
                    key={`media-${activeIndex}`}
                    src={current.media}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full max-w-5xl h-auto rounded-2xl shadow-2xl"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  />
                ) : (
                  <motion.img
                    key={`media-${activeIndex}`}
                    src={current.media}
                    alt={current.alt ?? current.title}
                    className="w-full max-w-5xl h-auto rounded-2xl shadow-2xl"
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 260, damping: 26 }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
