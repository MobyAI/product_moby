"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

const scriptLines = [
  "[tag: excited] I can't believe you did that",
  "[tag: sighs] Get out of here now",
  "I'm so sorry [tag: whispers] for everything",
  "This is the best day ever [tag: laughs]",
  "[tag: nervous] I don't know if I can do this",
];

export default function AudioTagDemo() {
  const [animationKey, setAnimationKey] = useState(0);
  const [showPill, setShowPill] = useState(false);
  const [showCursor, setShowCursor] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const [textBefore, setTextBefore] = useState("");
  const [textAfter, setTextAfter] = useState("");
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [tagText, setTagText] = useState("");
  const pillControls = useAnimation();
  const textControls = useAnimation();
  const isAnimatingRef = React.useRef(false);

  useEffect(() => {
    if (isAnimatingRef.current) return;

    let isCancelled = false;

    const runAnimation = async () => {
      isAnimatingRef.current = true;

      const currentLine = scriptLines[currentLineIndex];
      const tagMatch = currentLine.match(/\[tag: (\w+)\]/);

      if (!tagMatch) return;

      const extractedTag = tagMatch[1];
      const tagStartIndex = currentLine.indexOf("[tag:");
      const tagEndIndex = currentLine.indexOf("]", tagStartIndex) + 1;

      const before = currentLine.slice(0, tagStartIndex).trim();
      const after = currentLine.slice(tagEndIndex).trim();

      // Reset
      setDisplayedText("");
      setTextBefore("");
      setTextAfter("");
      setShowPill(false);
      setShowCursor(true);
      setTagText(extractedTag);
      pillControls.set({ scale: 0, opacity: 0 });
      textControls.set({ opacity: 1 });

      // Small delay before starting
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (isCancelled) return;

      // Type out the full line including the tag
      const fullText = currentLine;
      for (let i = 0; i <= fullText.length; i++) {
        if (isCancelled) return;
        const text = fullText.slice(0, i);
        setDisplayedText(text);
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      // Wait a moment
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isCancelled) return;

      // Hide cursor when transforming to pill
      setShowCursor(false);

      // Transform to pill - set text before and after
      setDisplayedText("");
      setTextBefore(before);
      setTextAfter(after);
      setShowPill(true);

      // Animate pill in
      await pillControls.start({
        scale: [0, 1.2, 1],
        opacity: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut",
        },
      });
      if (isCancelled) return;

      // Emphasis animation - grow and shrink
      await pillControls.start({
        scale: [1, 1.15, 1, 1.1, 1],
        transition: {
          duration: 0.6,
          ease: "easeInOut",
        },
      });
      if (isCancelled) return;

      // Hold for viewing
      await new Promise((resolve) => setTimeout(resolve, 2500));
      if (isCancelled) return;

      // Fade everything out together
      await Promise.all([
        pillControls.start({
          opacity: 0,
          transition: { duration: 0.3 },
        }),
        textControls.start({
          opacity: 0,
          transition: { duration: 0.3 },
        }),
      ]);
      if (isCancelled) return;

      await new Promise((resolve) => setTimeout(resolve, 100));
      setDisplayedText("");
      setTextBefore("");
      setTextAfter("");

      // Move to next line
      const nextIndex = (currentLineIndex + 1) % scriptLines.length;
      setCurrentLineIndex(nextIndex);

      // Wait before restart
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isCancelled) return;

      // Restart
      isAnimatingRef.current = false;
      setAnimationKey((prev) => prev + 1);
    };

    runAnimation();

    // Cleanup function
    return () => {
      isCancelled = true;
      isAnimatingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey]);

  return (
    <div className="w-full max-w-xl aspect-[2.5/1] bg-primary-light-alt rounded-xl overflow-hidden relative">
      {/* Container with padding */}
      <div className="h-full flex flex-col justify-center relative px-12 py-6 gap-4">
        {/* Header */}
        <h3 className="text-2xl font-semibold text-primary-dark ml-1">
          Edit Line:
        </h3>

        {/* Input Display Area */}
        <div className="w-full max-w-lg">
          <div className="relative bg-white/70 backdrop-blur-sm rounded-lg px-4 py-3 border-2 border-gray-300 focus-within:border-purple-400 transition-colors min-h-[80px] flex items-center">
            <motion.div
              animate={textControls}
              className="flex flex-wrap items-center gap-2 text-lg text-primary-dark"
              style={{ willChange: "contents" }}
            >
              {!showPill ? (
                <span style={{ willChange: "contents" }}>{displayedText}</span>
              ) : (
                <>
                  {textBefore && <span>{textBefore} </span>}
                  <motion.span
                    animate={pillControls}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-purple-500 text-white text-sm font-medium shadow-md"
                  >
                    {tagText}
                  </motion.span>
                  {textAfter && <span> {textAfter}</span>}
                </>
              )}
              {showCursor && (
                <span className="inline-block w-0.5 h-5 bg-primary-dark animate-pulse ml-1"></span>
              )}
            </motion.div>
          </div>
          <p className="text-xs text-primary-dark/60 mt-2">
            {`Add "audio tags" to fine-tune the delivery of each line`}
          </p>
        </div>
      </div>
    </div>
  );
}
