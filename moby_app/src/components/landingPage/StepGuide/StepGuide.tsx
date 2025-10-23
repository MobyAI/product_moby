import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

export type StepItem = {
  title: string;
  body?: string;
  media: string; // Now supports mp4 files
  alt?: string;
};

export type StepGuideProps = {
  steps: StepItem[];
  className?: string;
  loop?: boolean;
};

const slideVariants = {
  initial: { y: 40, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -40, opacity: 0 },
};

export default function StepGuide({ steps, className, loop = true }: StepGuideProps) {
  const [index, setIndex] = useState(0);
  const atStart = index === 0;
  const atEnd = index >= steps.length - 1;
  const canAdvance = loop || !atEnd;

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    setIndex((i) => (i + 1) % steps.length);
  }, [canAdvance, steps.length]);

  const handlePrev = useCallback(() => {
    if (atStart && !loop) return;
    setIndex((i) => (i - 1 + steps.length) % steps.length);
  }, [atStart, loop, steps.length]);

  const current = useMemo(() => steps[index], [steps, index]);

  const isVideo = current.media.endsWith(".mp4") || current.media.includes(".mp4?");

  return (
    <section
      className={`w-[80%] mx-auto py-12 sm:py-16 flex flex-col md:flex-row overflow-hidden rounded-3xl shadow-lg border border-slate-200/70 min-h-[600px] sm:min-h-[700px] mt-16 ${className ?? ""} step-guide`}
      aria-roledescription="Step by step guide"
    >
      {/* LEFT: Instructions */}
      <div className="flex-1 p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/70 dark:border-white/10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`left-${index}`}
            variants={slideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="flex flex-col h-full"
          >
            <header className="mb-3">
              <p className="text-xs tracking-wider font-semibold uppercase text-slate-500">
                Step {index + 1} of {steps.length}
              </p>
              <h3 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                {current.title}
              </h3>
            </header>
            {current.body && (
              <p className="text-slate-600 dark:text-slate-300/90 text-base leading-relaxed">
                {current.body}
              </p>
            )}

            <div className="mt-auto pt-8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label={canAdvance ? "Next step" : "End of guide"}
                  className={`group inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base bg-slate-900 text-white hover:bg-slate-800 focus`}
                >
                  <span>{canAdvance ? "Next" : "Get started!"}</span>
                  {canAdvance && (
                    <motion.span
                      aria-hidden
                      animate={{ y: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="grid place-items-center"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </motion.span>
                  )}
                </button>
                {!atStart && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Previous step"
                    className="group inline-flex items-center gap-2 rounded-lg px-5 py-3 text-base bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 border border-slate-200/70"
                  >
                    <span>Previous</span>
                    <motion.span
                      aria-hidden
                      animate={{ y: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                      className="grid place-items-center"
                    >
                      <ChevronUp className="w-5 h-5" />
                    </motion.span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RIGHT: Media */}
      <div className="flex-1 md:flex-[1.2] p-0 sm:p-0 flex items-center justify-center overflow-hidden bg-transparent rounded-xl" style={{ marginRight: 15 }}>
        <AnimatePresence mode="wait">
          {isVideo ? (
            <motion.video
              key={`media-${index}`}
              src={current.media}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover rounded-none"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            />
          ) : (
            <motion.img
              key={`media-${index}`}
              src={current.media}
              alt={current.alt ?? current.title}
              className="w-full h-full object-contain"
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}