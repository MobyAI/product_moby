import React, { useState, ReactNode } from "react";
import {
  Clock,
  User,
  Moon,
  Sun,
  X,
  DoorOpen,
  Expand,
  ListRestart,
} from "lucide-react";
import type { ScriptElement } from "@/types/script";
import { RoleSelector } from "./roleSelector";

type PanelType = "auto" | "roles" | "mode" | "fullscreen" | "drag" | null;

interface ControlPanelProps {
  children: ReactNode;
  script?: ScriptElement[] | null;
  userID?: string;
  scriptID?: string | null;
  skipMs?: number;
  onSkipMsChange: (value: number) => void;
  onRolesUpdated: (updatedScript: ScriptElement[]) => void;
  onGoBack: () => void;
  isBusy?: boolean;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
  onToggleFullscreen?: () => void;
  onResetDrag?: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  children,
  script,
  userID,
  scriptID,
  skipMs = 4000,
  onSkipMsChange,
  onRolesUpdated,
  onGoBack,
  isBusy = false,
  isDarkMode = false,
  onToggleTheme,
  onToggleFullscreen,
  onResetDrag,
}) => {
  const [activePanel, setActivePanel] = useState<PanelType>(null);

  const handleNavClick = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  return (
    <div className="flex h-screen bg-[#f5f7fb] relative">
      {/* Left Navigation Bar - Always visible */}
      <div className="w-20 bg-[#f5f7fb] border-r border-gray-200 flex flex-col items-center py-4 space-y-6 z-20">
        <div className="text-logo text-[#363c54] cursor-default">
          tr
        </div>

        <button
          onClick={() => handleNavClick("auto")}
          className={`p-2 rounded-lg transition-colors group relative
            hover:bg-gray-200
            ${activePanel === "auto" ? "bg-gray-200" : ""}
            `}
        >
          <Clock className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          {!activePanel && (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-primary-dark-alt text-primary-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              Auto Advance
            </span>
          )}
        </button>

        <button
          onClick={() => handleNavClick("roles")}
          className={`p-2 rounded-lg transition-colors group relative
            hover:bg-gray-200
            ${activePanel === "roles" ? "bg-gray-200" : ""}
            `}
        >
          <User className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          {!activePanel && (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-primary-dark-alt text-primary-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              Role Change
            </span>
          )}
        </button>

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors group relative"
        >
          {isDarkMode ? (
            <Moon className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          ) : (
            <Sun className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          )}
          {!activePanel && (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-primary-dark-alt text-primary-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              {isDarkMode ? "Toggle Light Mode" : "Toggle Dark Mode"}
            </span>
          )}
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors group relative"
        >
          <Expand className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          {!activePanel && (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-primary-dark-alt text-primary-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              Fullscreen Mode
            </span>
          )}
        </button>

        <button
          onClick={onResetDrag}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors group relative"
        >
          <ListRestart className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          {!activePanel && (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-primary-dark-alt text-primary-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              Reset Custom Start/End
            </span>
          )}
        </button>

        <button
          onClick={onGoBack}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors group relative"
        >
          <DoorOpen className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          {!activePanel && (
            <span className="absolute left-12 top-1/2 -translate-y-1/2 bg-primary-dark-alt text-primary-light text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity z-50">
              Exit
            </span>
          )}
        </button>
      </div>

      {/* Settings Panel - Absolutely positioned */}
      <div
        className={`
                    absolute left-20 top-0 h-full w-56 bg-[#f5f7fb] border-r border-gray-200 p-4 z-10
                    transform transition-transform duration-300 ease-in-out
                    ${activePanel ? "translate-x-0" : "-translate-x-full"}
                `}
      >
        {activePanel && (
          <>
            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-sm font-medium text-gray-700">
                {activePanel === "auto" && "Auto Advance"}
                {activePanel === "roles" && "Role Selector"}
              </h3>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Role Selection Panel Content */}
            {activePanel === "roles" && script && (
              <div className="space-y-2">
                <RoleSelector
                  script={script}
                  userID={userID!}
                  scriptID={scriptID!}
                  disabled={isBusy}
                  onRolesUpdated={onRolesUpdated}
                />
              </div>
            )}

            {/* Auto Advance Panel Content */}
            {activePanel === "auto" && (
              <div className="text-sm text-gray-600">
                <label htmlFor="skipMs" className="sr-only">
                  Skip to next line delay
                </label>
                <div className="text-sm flex items-center flex-wrap gap-2">
                  <span className="font-semibold">Silence Detection:</span>
                  <span className="text-gray-500">Auto advance after</span>
                  <select
                    id="skipMs"
                    value={skipMs}
                    onChange={(e) => onSkipMsChange?.(Number(e.target.value))}
                    className="appearance-none bg-white border border-gray-300 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={isBusy}
                  >
                    <option value={2000}>2s</option>
                    <option value={4000}>4s</option>
                    <option value={6000}>6s</option>
                    <option value={8000}>8s</option>
                    <option value={10000}>10s</option>
                  </select>
                  <span className="text-gray-500">of silence.</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Main Content Area - adjusts margin when panel is open */}
      <div
        className={`
                flex-1 overflow-auto transition-all duration-200
                ${activePanel ? "ml-56" : "ml-0"}
            `}
      >
        {children}
      </div>
    </div>
  );
};
