"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { ScriptData } from "./ScriptsListClient";

interface ScriptSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  unpinnedScripts: ScriptData[];
  onSelect: (scriptId: string) => Promise<void>;
  isPinning: boolean;
}

export function ScriptSelectorModal({
  isOpen,
  onClose,
  unpinnedScripts,
  onSelect,
  isPinning,
}: ScriptSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter scripts based on search term
  const filteredScripts = useMemo(() => {
    if (!searchTerm.trim()) return unpinnedScripts;
    const lower = searchTerm.toLowerCase();
    return unpinnedScripts.filter((s) => s.name.toLowerCase().includes(lower));
  }, [unpinnedScripts, searchTerm]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    } else {
      // Auto-focus search input when modal opens
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelect = async (scriptId: string) => {
    await onSelect(scriptId);
    // Small delay to show success before closing
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!isOpen) return null;

  if (isPinning) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div
          className="bg-primary-light-alt rounded-lg py-10 px-15 flex flex-col items-center justify-center gap-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-xl font-semibold text-primary-dark mb-4">
            Pinning your script...
          </h3>
          <div className="w-20 h-20 mx-auto relative">
            <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
            <div
              className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
              style={{ animationDuration: "1.5s" }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-primary-light-alt rounded-lg max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="relative p-6 pb-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-header-3 text-primary-dark">
              Select Script to Pin
            </h3>
            <button
              onClick={onClose}
              className="absolute right-5 top-5 z-10 text-gray-400 hover:opacity-80 hover:cursor-pointer transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search scripts..."
              className="w-full px-4 py-2 pr-10 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setSearchTerm("");
                }
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {!searchTerm && (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 pt-2">
          {filteredScripts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              {searchTerm
                ? "No scripts match your search"
                : "No unpinned scripts available"}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredScripts.map((script) => {
                return (
                  <button
                    key={script.id}
                    onClick={() => handleSelect(script.id)}
                    className="w-full text-left p-4 rounded-lg bg-white/40 hover:bg-white/90 hover:cursor-pointer transition-all relative"
                  >
                    <p className="font-semibold text-primary-dark">
                      {script.name}
                    </p>
                    {script.createdAt && (
                      <p className="text-sm text-gray-500 mt-1">
                        Uploaded:{" "}
                        {script.createdAt.toDate().toLocaleDateString()}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
