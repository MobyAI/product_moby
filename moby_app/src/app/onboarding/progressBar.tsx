"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  text: string;
  field: string;
  type: string;
  getDynamicText?: () => string;
}

interface ProgressBarProps {
  currentStep: number;
  questions: Question[];
  completed?: boolean;
}

export default function ProgressBar({
  currentStep,
  questions,
  completed,
}: ProgressBarProps) {
  const totalSteps = questions.length;
  const [highestStep, setHighestStep] = useState(currentStep);

  useEffect(() => {
    if (currentStep > highestStep) {
      setHighestStep(currentStep);
    }
  }, [currentStep, highestStep]);

  return (
    <div className="fixed top-1/4 left-0 right-40 pointer-events-none z-20">
      <div className="max-w-2xl mx-auto px-6 relative">
        <div className="absolute -left-20 pointer-events-auto">
          <div className="relative flex flex-col items-center">
            {questions.map((_, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              const isPast =
                index < currentStep || (completed && index === totalSteps - 1);
              const hasBeenAnimated = index < highestStep - 1;
              const shouldAnimateLine =
                index === currentStep - 1 && currentStep > highestStep - 1;
              const shouldAnimateCircle =
                index === currentStep - 1 && currentStep > highestStep - 1;

              return (
                <div key={index} className="flex flex-col items-center">
                  {/* --- Circle --- */}
                  <motion.div
                    className="relative flex items-center justify-center z-10"
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.2 : 1,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 100,
                      damping: 12,
                    }}
                  >
                    {/* Outer ring for current step */}
                    <AnimatePresence>
                      {isCurrent && !completed && (
                        <motion.div
                          key={`ring-${index}`}
                          className="absolute w-3 h-3 rounded-full border-[3px] border-primary-dark-alt z-100"
                        />
                      )}
                    </AnimatePresence>

                    {/* Inner circle with animated fill */}
                    <div className="relative w-3 h-3">
                      {/* Border circle (always visible) */}
                      <motion.div
                        className="absolute inset-0 rounded-full border-2"
                        initial={false}
                        animate={{
                          borderColor:
                            isCompleted || isCurrent
                              ? "rgb(54,60,84)"
                              : "rgba(153, 153, 153, 1)",
                        }}
                        transition={{
                          duration: 0.3,
                          delay: isCurrent && shouldAnimateLine ? 0.9 : 0, // Step 3: Border changes after line completes
                        }}
                      />

                      {/* Fill circle */}
                      {isPast && (
                        <motion.div
                          className="absolute inset-0 rounded-full bg-primary-dark-alt"
                          initial={{ scale: hasBeenAnimated ? 1 : 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            duration: shouldAnimateCircle ? 0.4 : 0,
                            delay: 0, // Step 1: Circle fills immediately
                            ease: "easeOut",
                          }}
                          style={{
                            backgroundColor: "rgb(54,60,84)",
                            transformOrigin: "center",
                          }}
                        />
                      )}
                    </div>
                  </motion.div>

                  {/* --- Connector line (not after last) --- */}
                  {index < totalSteps - 1 && (
                    <div className="relative w-0.5 h-4 -z-10">
                      {/* Background line (gray) */}
                      <div className="absolute inset-0 bg-gray-400" />

                      {/* Fill line */}
                      {isPast && (
                        <motion.div
                          className="absolute left-0 top-0 w-full origin-top"
                          initial={{ scaleY: hasBeenAnimated ? 1 : 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{
                            duration: shouldAnimateLine ? 0.5 : 0,
                            delay: shouldAnimateLine ? 0.4 : 0, // Step 2: Line waits for circle to complete
                            ease: "easeInOut",
                          }}
                          style={{
                            backgroundColor: "rgb(54,60,84)",
                            height: "100%",
                            transformOrigin: "top",
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
