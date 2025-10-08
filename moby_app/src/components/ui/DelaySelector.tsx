import { useState } from "react";
import type { ScriptElement } from "@/types/script";
import { Check, Hourglass } from "lucide-react";
import { set } from "idb-keyval";

interface DelaySelectorProps {
    lineIndex: number;
    currentDelay?: number;
    onDelayChange?: (lineIndex: number, delayValue: number) => void;
    scriptId: string | null;
    userId: string | null;
    script: ScriptElement[] | null;
    setScript: React.Dispatch<React.SetStateAction<ScriptElement[] | null>>;
    updateScript: (scriptId: string, updatedScript: ScriptElement[]) => Promise<void>;
    updatingState: [boolean, React.Dispatch<React.SetStateAction<boolean>>];
    isDarkMode: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DELAY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
    { value: 0, label: 'No delay' },
    { value: 500, label: '0.5s delay' },
    { value: 1000, label: '1s delay' },
    { value: 2000, label: '2s delay' },
    { value: 3000, label: '3s delay' },
    { value: 4000, label: '4s delay' },
    { value: 5000, label: '5s delay' },
] as const;

type DelayValue = typeof DELAY_OPTIONS[number]['value'];

// Component for the delay selector button and dropdown
export const DelaySelector: React.FC<DelaySelectorProps> = ({
    lineIndex,
    currentDelay = 0,
    onDelayChange,
    scriptId,
    userId,
    script,
    setScript,
    updateScript,
    updatingState,
    isDarkMode,
}) => {
    const [showDelayDropdown, setShowDelayDropdown] = useState<boolean>(false);
    const [updating, setUpdating] = updatingState;

    const handleAddDelay = async (delayValue: DelayValue): Promise<void> => {
        if (!script || !scriptId || !userId) return;

        setUpdating(true);

        try {
            // Find and update the script element with matching index
            const updatedScript: ScriptElement[] = script.map((element) => {
                if (element.index === lineIndex) {
                    return {
                        ...element,
                        customDelay: delayValue
                    };
                }
                return element;
            });

            // Update local state immediately for UI responsiveness
            setScript(updatedScript);
            // console.log('added delay: ', updatedScript);

            // Call parent's onDelayChange if provided
            if (onDelayChange) {
                onDelayChange(lineIndex, delayValue);
            }

            // Update Firestore
            await updateScript(scriptId, updatedScript);
            console.log(`✅ Updated Firestore with custom delay for line ${lineIndex}`);

            // Update IndexedDB cache
            const cacheKey: string = `script-cache:${userId}:${scriptId}`;
            try {
                // In your actual implementation, uncomment this:
                await set(cacheKey, updatedScript);
                console.log('💾 Script cached successfully with custom delay');
            } catch (cacheError) {
                console.warn('⚠️ Failed to update cache with custom delay:', cacheError);
                // Don't throw - Firestore update succeeded
            }

            // Close dropdown after successful update
            setShowDelayDropdown(false);
        } catch (error) {
            console.error('❌ Error updating delay:', error);
        } finally {
            setUpdating(false);
        }
    };

    const formatDelay = (ms: number): string => {
        return `${ms / 1000}s`;
    };

    return (
        <div className={`relative`}>
            {/* Delay Dropdown - shows on button click */}
            {showDelayDropdown && (
                <div className="absolute left-full ml-2 top-5/6 transform -translate-y-1/2 z-[1000] bg-gray-200 rounded-md p-1 shadow-xl">
                    <div className="flex flex-col">
                        {[0, 500, 1000, 2000, 3000, 4000, 5000].map((value) => (
                            <button
                                key={value}
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    handleAddDelay(value as DelayValue);
                                    setShowDelayDropdown(false);
                                }}
                                className={`relative pl-5 pr-3 py-1 text-sm font-medium text-left transition-colors rounded ${currentDelay === value
                                    ? 'text-black hover:bg-blue-500 hover:text-white'
                                    : 'text-black hover:bg-blue-500 hover:text-white'
                                    }`}
                                type="button"
                            >
                                {currentDelay === value && (
                                    <Check
                                        className="absolute left-1 top-1/2 transform -translate-y-1/2 w-3 h-3"
                                        strokeWidth={4}
                                    />
                                )}
                                <span>{value / 1000}s</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Delay Button */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowDelayDropdown(!showDelayDropdown);
                }}
                onBlur={() => setShowDelayDropdown(false)}
                className={`cursor-pointer flex items-center text-sm px-3 py-1.5 rounded shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode
                        ? "text-primary-dark-alt bg-primary-light"
                        : "bg-primary-dark-alt text-primary-light"
                    }`}
                title="Add Delay"
                disabled={updating}
                type="button"
            >
                <Hourglass
                    className={`w-4 h-4 ${updating ? 'animate-spin-pause' : ''}`}
                    strokeWidth={2}
                />
                <span className="ml-1.5 font-semibold">
                    {formatDelay(currentDelay || 0)}
                </span>
            </button>
        </div>
    );
};