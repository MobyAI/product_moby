"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

export default function VoiceSelectionDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Character names and typing animation
  const characterNames = [
    "Olivia",
    "Emma",
    "Sophia",
    "Isabella",
    "Charlotte",
    "Amelia",
  ];
  const [currentNameIndex, setCurrentNameIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Typing animation effect
  useEffect(() => {
    const currentName = characterNames[currentNameIndex];

    if (isTyping) {
      // Typing out
      if (displayedText.length < currentName.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentName.slice(0, displayedText.length + 1));
        }, 100);
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, wait before deleting
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      // Deleting
      if (displayedText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayedText(displayedText.slice(0, -1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        // Finished deleting, move to next name
        setCurrentNameIndex((prev) => (prev + 1) % characterNames.length);
        setIsTyping(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayedText, isTyping, currentNameIndex]);

  useEffect(() => {
    audioRef.current = new Audio("/jessica.mp3");

    const audio = audioRef.current;

    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="w-full max-w-md xl:max-w-lg aspect-[1.5/1] xl:aspect-[2/1] bg-primary-light-alt rounded-xl overflow-hidden relative">
      <style>{`
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        .blinking-cursor {
          animation: blink 1s step-end infinite;
        }
      `}</style>
      {/* Container with padding */}
      <div className="h-full flex flex-col items-start justify-center relative px-12 py-6 gap-4">
        {/* Header */}
        <h3 className="text-lg sm:text-2xl font-semibold text-primary-dark ml-1">
          Assign Voice for:{" "}
          <span className="text-blue-300 ml-0.5">
            {displayedText}
            <span className="blinking-cursor ml-0.5">|</span>
          </span>
        </h3>

        {/* Voice Card - more horizontal */}
        <div className="w-full max-w-lg h-32 px-6 py-4 rounded-2xl cursor-pointer transition-all duration-300 bg-[#A8A8A8]/10 hover:bg-[#A8A8A8]/20 flex flex-col sm:flex-row items-center justify-between gap-1 sm:gap-6">
          {/* Left section: Name + Description */}
          <div className="flex-1">
            <h4 className="font-semibold text-primary-dark text-sm sm:text-lg">
              Jessica
              <span className="text-xs sm:text-base text-yellow-500 font-normal ml-1">
                (crowd favorite)
              </span>
            </h4>

            <p className="text-xs sm:text-md text-primary-dark/80 mt-2 line-clamp-2 leading-relaxed">
              Young, popular, animated, playful female
            </p>
          </div>

          {/* Right section: Play button */}
          <div className="relative group">
            <button
              onClick={handlePlay}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-12 sm:h-12 rounded-full cursor-pointer hover:scale-110 active:scale-95 transition-all duration-300 text-white font-medium bg-primary-dark shadow-md"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 sm:w-6 sm:h-6" />
              ) : (
                <Play className="w-4 h-4 sm:w-6 sm:h-6" />
              )}
            </button>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-white text-black text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
              Press play!
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
