import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Trash,
  Play,
  PinOff,
  Pencil,
  Ellipsis,
  X,
  Clock,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui";
import { Timestamp } from "firebase/firestore";

interface ScriptCardProps {
  name: string;
  createdAt: Timestamp | null;
  lastPracticed: Timestamp | null;
  pinned: boolean;
  pinnedItemId: string | null;
  handleDelete: () => void;
  handlePractice: () => void;
  handleTogglePinned: () => void;
  handleEdit: () => void;
  classNames: string;
}

export function ScriptCard({
  name,
  createdAt,
  lastPracticed,
  pinned,
  pinnedItemId,
  handleDelete,
  handlePractice,
  handleTogglePinned,
  handleEdit,
  classNames,
}: ScriptCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  const date = createdAt?.toDate ? createdAt.toDate() : null;
  const formatted = date
    ? date.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const practicedDate = lastPracticed?.toDate ? lastPracticed.toDate() : null;
  const formattedLastPracticed = practicedDate
    ? practicedDate
        .toLocaleString("en-US", {
          month: "numeric",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        .replace(",", " at")
    : "";

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
            {/* Toggle Pinned button - above to the left */}
            <motion.button
              key="pin-button"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: 1, x: -52, y: -28 }}
              exit={{ scale: 0, x: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.05,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePinned();
                setIsMenuOpen(false);
              }}
              disabled={pinnedItemId != null}
              className="absolute p-3 rounded-full bg-primary-dark shadow-xl hover:cursor-pointer text-white transition-colors z-10 group"
              aria-label={pinned ? "Unpin" : "Pin"}
            >
              <PinOff className="w-5 h-5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-primary-dark rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {pinned ? "Unpin" : "Pin"}
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
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
                setIsMenuOpen(false);
              }}
              className="absolute p-3 rounded-full bg-primary-dark shadow-xl hover:cursor-pointer text-white transition-colors z-10 group"
              aria-label="Delete"
            >
              <Trash className="w-5 h-5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-primary-dark rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Delete
              </span>
            </motion.button>

            {/* Edit button - above */}
            <motion.button
              key="edit-button"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ scale: 1, x: 0, y: -56 }}
              exit={{ scale: 0, x: 0, y: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0,
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
                setIsMenuOpen(false);
              }}
              className="absolute p-3 rounded-full bg-primary-dark shadow-xl hover:cursor-pointer text-white transition-colors z-10 group"
              aria-label="Edit"
            >
              <Pencil className="w-5 h-5" />
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-primary-dark rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Edit
              </span>
            </motion.button>
          </>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <div
      className={`${classNames} rounded-[20px] py-7 px-8 transition-shadow duration-200
      w-85 h-55 2xl:w-90 flex flex-col justify-between relative`}
    >
      {/* Expandable menu for star/delete */}
      <div className="absolute top-4 right-4">
        <button
          ref={toggleButtonRef}
          onClick={(e) => {
            e.stopPropagation();
            setIsMenuOpen(!isMenuOpen);
          }}
          className={`p-3 rounded-full hover:cursor-pointer transition-colors ${
            isMenuOpen ? "bg-white text-black" : "text-black hover:bg-white/10"
          }`}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Ellipsis className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Portal the menu buttons to document body */}
      {typeof document !== "undefined" &&
        createPortal(menuButtons, document.body)}

      {/* Content */}
      <div className="flex-1 flex flex-col gap-3 pr-8">
        {/* Script Name */}
        <h3
          className="text-2xl font-semibold text-black truncate leading-tight"
          title={name}
        >
          {name}
        </h3>

        {/* Metadata with icons */}
        <div className="flex flex-col gap-2 text-black/80">
          {formatted && (
            <div className="flex items-center gap-2 text-sm">
              <span className="flex-shrink-0" title="Upload date">
                <Calendar className="w-4 h-4" />
              </span>
              <span className="font-medium">{formatted}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm">
            <span className="flex-shrink-0" title="Last practiced">
              <Clock className="w-4 h-4" />
            </span>
            <span className="font-medium">{formattedLastPracticed ? formattedLastPracticed : "Not practiced yet"}</span>
          </div>
        </div>
      </div>

      {/* Practice button */}
      <Button
        onClick={handlePractice}
        icon={Play}
        variant="primary"
        size="md"
        aria-label="Practice script"
        className="w-full h-11"
      >
        Practice
      </Button>
    </div>
  );
}
