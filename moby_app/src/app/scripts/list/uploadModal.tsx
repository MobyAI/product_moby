import React, { useState, useEffect, useRef } from 'react';
import { addScript } from '@/lib/firebase/client/scripts';
import { auth } from '@/lib/firebase/client/config/app';
import { onAuthStateChanged } from 'firebase/auth';
import { extractScriptText } from '@/lib/api/parse/extract';
import { extractRolesFromText } from '@/lib/api/parse/roles';
import { parseScriptFromText } from '@/lib/api/parse/parse';
import { ScriptElement } from '@/types/script';
import { getAllVoiceSamples } from '@/lib/firebase/client/tts';
import { ConfirmModal } from "@/components/ui";

// Error handling! Especially for api calls. What to do if failed?
// What if stage has an error (like parsed script) and nothing is shown?

interface ScriptUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    onComplete: () => void;
}

interface ExtractedTextResult {
    parseId: string;
    name: string;
    ext?: string;
    text: string;
}

interface VoiceSample {
    name: string;
    description: string;
    url: string;
    voiceId: string;
}

interface VoiceAssignment {
    voiceId: string;
    voiceName: string;
}

interface RoleVoiceAssignmentProps {
    role: string;
    voiceSamples: VoiceSample[] | null;
    onAssign: (assignment: VoiceAssignment) => void;
    isLoading?: boolean;
}

interface ScriptRendererProps {
    script: ScriptElement[] | null;
    onScriptUpdate?: (updatedScript: ScriptElement[]) => void;
    editable?: boolean;
}

interface EditableLineProps {
    item: ScriptElement;
    onUpdate: (updatedItem: ScriptElement) => void;
    onClose: () => void;
}

export default function ScriptUploadModal({
    isOpen,
    onClose,
    file,
    onComplete
}: ScriptUploadModalProps) {
    // Core State
    const [currentStage, setCurrentStage] = useState(0);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [extractedText, setExtractedText] = useState<ExtractedTextResult | null>(null);
    const [extractedRoles, setExtractedRoles] = useState<string[] | null>([]);
    const [parsedScript, setParsedScript] = useState<ScriptElement[] | null>(null);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);
    const [scriptSaving, setScriptSaving] = useState(false);

    // User Inputs State
    const [scriptName, setScriptName] = useState('');
    const [roleAssignments, setRoleAssignments] = useState<Record<string, 'user' | 'scene-partner'>>({});
    const [userRole, setUserRole] = useState('');
    const [missingCharacters, setMissingCharacters] = useState<string[]>([]);

    // Voice library state
    const [voiceSamples, setVoiceSamples] = useState<VoiceSample[] | null>(null);
    const [voicesLoading, setVoicesLoading] = useState(false);
    const [voiceAssignments, setVoiceAssignments] = useState<Record<string, VoiceAssignment>>({});
    const [confirmationModal, setConfirmationModal] = useState<{
        isOpen: boolean;
        role: string;
        assignment: VoiceAssignment;
    } | null>(null);

    // Processing State
    const [processingStage, setProcessingStage] = useState<{
        message: string;
        isComplete: boolean;
    }>({ message: '', isComplete: false });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isParsingInBackground, setIsParsingInBackground] = useState(false);

    // Animation State
    const [isTransitioning, setIsTransitioning] = useState(false);
    const modalRef = useRef(null);

    // Reset function
    const resetModal = () => {
        setCurrentStage(0);
        setExtractedText(null);
        setExtractedRoles([]);
        setParsedScript(null);
        setScriptName('');
        setRoleAssignments({});
        setVoiceAssignments({});
        setUserRole('');
        setShowCloseConfirm(false);
        setProcessingStage({ message: '', isComplete: false });
        setIsParsingInBackground(false);
        setIsTransitioning(false);
    };

    // Update handleClose to show confirmation
    const handleClose = () => {
        setShowCloseConfirm(true);
    };

    const confirmClose = () => {
        setShowCloseConfirm(false);
        resetModal();
        onClose();
    };

    // Start processing when file is provided
    useEffect(() => {
        if (!isOpen) return;

        // Load voices (checking auth)
        if (!voiceSamples && !voicesLoading) {
            if (auth.currentUser) {
                // User already authenticated
                loadVoiceSamples();
            } else {
                // Set up listener in case auth is still initializing
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    if (user) {
                        loadVoiceSamples();
                        unsubscribe(); // Unsubscribe after loading
                    }
                });
                return () => unsubscribe();
            }
        }

        // Start file processing if file exists
        if (file) {
            startProcessing();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, file]);

    // Separate the voice loading function
    const loadVoiceSamples = async () => {
        setVoicesLoading(true);
        try {
            const data = await getAllVoiceSamples();
            setVoiceSamples(data);
        } catch (err) {
            console.error('Failed to load voice samples:', err);
        } finally {
            setVoicesLoading(false);
        }
    };

    const startProcessing = async () => {
        if (!file) return;

        try {
            // Stage 1: Extract Text
            setProcessingStage({ message: 'Extracting text from document...', isComplete: false });
            setCurrentStage(1);

            // TODO: Replace with actual API call
            const textResult = await extractScriptText(file);
            setExtractedText(textResult);

            // Stage 2: Extract Roles (automatic)
            setProcessingStage({ message: 'Identifying characters...', isComplete: false });
            const rolesResult = await extractRolesFromText(textResult.text);
            setExtractedRoles(rolesResult);
            setCurrentStage(2); // Move to name input

            // Stage 3: Start parsing in background
            setIsParsingInBackground(true);
            setProcessingStage({ message: 'Parsing script structure...', isComplete: false });
            parseScriptFromText(textResult.text).then(result => {
                setParsedScript(result);
                setIsParsingInBackground(false);
                setProcessingStage({ message: 'Script parsing complete', isComplete: true });
            });

        } catch (error) {
            console.error('Processing error:', error);
            setProcessingStage({ message: 'Error occurred', isComplete: false });
        }
    };

    // Handle stage transitions
    const moveToNextStage = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setCurrentStage(prev => prev + 1);
            setIsTransitioning(false);
        }, 300);
    };

    // Auto advance from stage 5 to 6 when script is parsed
    useEffect(() => {
        if (currentStage === 5 && parsedScript) {
            // Extract unique characters from parsed script
            const scriptCharacters = new Set<string>();
            parsedScript.forEach(item => {
                if (item.type === 'line' && item.character) {
                    const normalized = item.character.toLowerCase().trim();
                    if (!scriptCharacters.has(normalized)) {
                        scriptCharacters.add(item.character); // Keep original casing
                    }
                }
            });

            // Find characters without voice assignments
            const charactersArray = Array.from(scriptCharacters);
            const missing = charactersArray.filter(
                char => !Object.keys(voiceAssignments).some(
                    assigned => assigned.toLowerCase().trim() === char.toLowerCase().trim()
                )
            );

            setMissingCharacters(missing);

            // Auto-advance if no missing characters
            if (missing.length === 0) {
                const timer = setTimeout(() => moveToNextStage(), 1500);
                return () => clearTimeout(timer);
            }
        }
    }, [currentStage, parsedScript, voiceAssignments]);

    // Check if can proceed to completion
    const canComplete = () => {
        return scriptName &&
            Object.keys(roleAssignments).length === extractedRoles?.length &&
            Object.keys(voiceAssignments).length === extractedRoles?.length &&
            userRole &&
            parsedScript;
    };

    const handleComplete = async () => {
        if (!parsedScript || !scriptName) {
            console.error('Missing script data or name');
            return;
        }

        // Show loading state while saving
        setProcessingStage({ message: 'Saving script...', isComplete: false });
        setScriptSaving(true);

        try {
            // Create normalized lookup maps and enrich the script
            const normalizedVoiceAssignments: Record<string, VoiceAssignment> = {};
            const normalizedRoleAssignments: Record<string, string> = {};

            Object.entries(voiceAssignments).forEach(([character, assignment]) => {
                normalizedVoiceAssignments[character.toLowerCase().trim()] = assignment;
            });

            Object.entries(roleAssignments).forEach(([character, role]) => {
                normalizedRoleAssignments[character.toLowerCase().trim()] = role;
            });

            const enrichedScript = parsedScript.map((item) => {
                if (item.type === 'line' && item.character) {
                    const normalizedCharacter = item.character.toLowerCase().trim();
                    const voiceAssignment = normalizedVoiceAssignments[normalizedCharacter];
                    const roleAssignment = normalizedRoleAssignments[normalizedCharacter];

                    return {
                        ...item,
                        voiceId: voiceAssignment?.voiceId || '',
                        voiceName: voiceAssignment?.voiceName || '',
                        role: (roleAssignment as 'user' | 'scene-partner') || 'scene-partner'
                    };
                }
                return item;
            });

            // Save to Firestore
            await addScript(scriptName, enrichedScript);

            setProcessingStage({ message: 'Script saved successfully!', isComplete: true });
            onComplete();
            resetModal();
            onClose();

        } catch (error) {
            console.error('Failed to save script:', error);
            setProcessingStage({ message: 'Failed to save script', isComplete: true });

            // Show error to user
            alert('Failed to save script. Please try again.');
        } finally {
            setScriptSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={scriptSaving ? undefined : handleClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden ${currentStage === 6 ? 'h-[95vh]' : 'max-h-[90vh]'}`}
            >
                {/* Header with Loading Progress */}
                <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-6 text-white">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold mb-2">Upload Script</h2>
                            <ProcessingIndicator stage={processingStage} />
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={scriptSaving}
                            className="text-white/80 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content Area with Progressive Inputs */}
                <div className={
                    currentStage === 6
                        ? 'flex flex-col h-[calc(90vh-100px)]'
                        : 'p-6 overflow-y-auto max-h-[60vh]'
                }>
                    <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'}`}>

                        {/* Stage 1: Loading */}
                        {currentStage === 1 && (
                            <div className="text-center py-12">
                                {/* Animated Logo/Icon */}
                                <div className="w-24 h-24 mx-auto mb-6 relative">
                                    <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin"></div>
                                    <div className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }}></div>
                                </div>
                                <p className="text-gray-600">Processing your script...</p>

                                {/* Fun Loading Messages */}
                                <div className="mt-8 text-white/60 text-sm">
                                    <RotatingTips tipSet="processing" />
                                </div>
                            </div>
                        )}

                        {/* Stage 2: Name Script */}
                        {currentStage === 2 && (
                            <InputStage
                                title="Name Your Script"
                                description="Give your script a memorable name"
                            >
                                <input
                                    type="text"
                                    value={scriptName}
                                    onChange={(e) => setScriptName(e.target.value)}
                                    onKeyUp={(e) => {
                                        if (e.key === 'Enter' && scriptName) {
                                            moveToNextStage();
                                        }
                                    }}
                                    placeholder="Enter script name..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                                {scriptName && (
                                    <button
                                        onClick={moveToNextStage}
                                        className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition"
                                    >
                                        Continue
                                    </button>
                                )}
                            </InputStage>
                        )}

                        {/* Stage 3: Assign Voices */}
                        {currentStage === 3 && extractedRoles && extractedRoles.length > 0 && (
                            (() => {
                                // Get the current index based on how many voices have been assigned
                                const currentIndex = Object.keys(voiceAssignments).length;

                                // Check if we've assigned all roles
                                if (currentIndex >= extractedRoles.length) return (
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                                            <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-600">Voices assigned to all roles!</p>
                                    </div>
                                );

                                const currentRole = extractedRoles[currentIndex];

                                return (
                                    <InputStage
                                        title="Assign Voices"
                                        description={`Character ${currentIndex + 1} of ${extractedRoles.length}`}
                                    >
                                        <RoleVoiceAssignment
                                            key={currentRole}
                                            role={currentRole}
                                            voiceSamples={voiceSamples}
                                            isLoading={voicesLoading}
                                            onAssign={(assignment) => {
                                                setConfirmationModal({
                                                    isOpen: true,
                                                    role: currentRole,
                                                    assignment
                                                });
                                            }}
                                        />

                                        {/* Confirmation Modal */}
                                        {confirmationModal?.isOpen && (
                                            <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-none">
                                                <div className="relative bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 rounded-lg p-6 max-w-sm mx-4 shadow-2xl pointer-events-auto">
                                                    <p className="text-white/90 mb-4">
                                                        Assign <span className="font-medium text-white">{confirmationModal.assignment.voiceName}</span> to <span className="font-medium text-white">{confirmationModal.role}</span>?
                                                    </p>
                                                    <p className="text-sm text-yellow-300 mb-6">
                                                        ⚠️ This selection cannot be changed later.
                                                    </p>
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() => setConfirmationModal(null)}
                                                            className="flex-1 px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                // Confirm the assignment
                                                                setVoiceAssignments(prev => ({
                                                                    ...prev,
                                                                    [confirmationModal.role]: confirmationModal.assignment
                                                                }));
                                                                setConfirmationModal(null);

                                                                // Check if this was the last role
                                                                if (currentIndex + 1 >= extractedRoles.length) {
                                                                    // Auto-advance after last role
                                                                    setTimeout(() => moveToNextStage(), 500);
                                                                }
                                                            }}
                                                            className="flex-1 px-4 py-2 bg-white text-blue-900 font-medium rounded-lg hover:bg-white/90 transition"
                                                        >
                                                            Confirm
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </InputStage>
                                );
                            })()
                        )}

                        {/* Stage 4: Select User Role */}
                        {currentStage === 4 && (
                            <InputStage
                                title="Select Your Role"
                                description="Which character will you be playing?"
                            >
                                <div className="space-y-2">
                                    {extractedRoles && extractedRoles.map(role => (
                                        <button
                                            key={role}
                                            onClick={() => {
                                                setUserRole(role);
                                                // Automatically assign other roles
                                                const assignments: Record<string, 'user' | 'scene-partner'> = {};
                                                extractedRoles.forEach(r => {
                                                    assignments[r] = r === role ? 'user' : 'scene-partner';
                                                });
                                                setRoleAssignments(assignments);
                                                moveToNextStage();
                                            }}
                                            className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-500 transition"
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            </InputStage>
                        )}

                        {/* Stage 5: Waiting for Parsing / Complete */}
                        {currentStage === 5 && (
                            <div className="text-center py-8">
                                {!parsedScript ? (
                                    // Loading state - waiting for script to parse
                                    <>
                                        <div className="w-24 h-24 mx-auto mb-6 relative">
                                            <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin"></div>
                                            <div className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }}></div>
                                        </div>
                                        <p className="text-gray-600 mb-2">Finalizing your script...</p>
                                        <p className="text-sm text-gray-500">This may take a moment</p>
                                        <div className="mt-8 text-white/60 text-sm">
                                            <RotatingTips tipSet="finalizing" />
                                        </div>
                                    </>
                                ) : missingCharacters.length > 0 ? (
                                    // Show voice assignment for missing characters
                                    <InputStage
                                        title="Additional Characters Found"
                                        description={`We found ${missingCharacters.length} more character${missingCharacters.length > 1 ? 's' : ''} in your script`}
                                    >
                                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm text-yellow-800">
                                                ⚠️ Assigning voice for: <span className="font-semibold">{missingCharacters[0]}</span>
                                            </p>
                                            <p className="text-xs text-yellow-700 mt-1">
                                                {missingCharacters.length - 1} more character{missingCharacters.length - 1 !== 1 ? 's' : ''} remaining
                                            </p>
                                        </div>

                                        <RoleVoiceAssignment
                                            key={missingCharacters[0]}
                                            role={missingCharacters[0]}
                                            voiceSamples={voiceSamples}
                                            isLoading={voicesLoading}
                                            onAssign={(assignment) => {
                                                // Assign voice
                                                setVoiceAssignments(prev => ({
                                                    ...prev,
                                                    [missingCharacters[0]]: assignment
                                                }));

                                                // Add to extracted roles if needed
                                                if (!extractedRoles?.includes(missingCharacters[0])) {
                                                    setExtractedRoles(prev => [...(prev || []), missingCharacters[0]]);
                                                }
                                            }}
                                        />
                                    </InputStage>
                                ) : (
                                    // All characters have voices - show success
                                    <div className="text-center">
                                        <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                                            <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-gray-600">All characters verified!</p>
                                        <p className="text-sm text-gray-500 mt-2">Moving to script review...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Stage 6: Script Review */}
                    {currentStage === 6 && (
                        <InputStage
                            title="Edit Your Script"
                            fullHeight={true}
                        >
                            <div className="flex flex-col h-full">
                                <p>Feel free to click on the lines to edit them if you need to.</p>
                                {/* Script container */}
                                <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-y-auto min-h-0">
                                    {scriptSaving ? (
                                        <div className="flex items-center justify-center h-full">
                                            <div className="w-24 h-24 relative">
                                                <div className="absolute inset-0 border-4 border-blue-900/20 rounded-full" />
                                                <div className="absolute inset-0 border-4 border-transparent border-t-purple-900 rounded-full animate-spin" />
                                                <div className="absolute inset-2 border-2 border-indigo-900/40 border-b-transparent rounded-full animate-spin animate-reverse"
                                                    style={{ animationDuration: '1.5s' }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <ScriptRenderer
                                            script={parsedScript}
                                            onScriptUpdate={(updatedScript) => setParsedScript(updatedScript)}
                                            editable={true}
                                        />
                                    )}
                                </div>

                                {/* Save button */}
                                <div className="pt-4 flex-shrink-0">
                                    <button
                                        onClick={handleComplete}
                                        disabled={!canComplete || scriptSaving}
                                        className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {scriptSaving ? 'Saving…' : 'Confirm & Save'}
                                    </button>
                                </div>
                            </div>
                        </InputStage>
                    )}
                </div>

                {/* Progress Indicators */}
                <div className="px-6 pb-4">
                    <div className="flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5, 6].map(stage => (
                            <div
                                key={stage}
                                className={`w-2 h-2 rounded-full transition-all ${currentStage >= stage ? 'bg-blue-600 w-8' : 'bg-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Close Confirmation Modal */}
                <ConfirmModal
                    isOpen={showCloseConfirm}
                    title="Confirm Close"
                    message="Are you sure you want to close? All your progress will be lost."
                    confirmLabel="Close"
                    cancelLabel="Cancel"
                    onConfirm={confirmClose}
                    onCancel={() => setShowCloseConfirm(false)}
                />
            </div>
        </div>
    );
};

// Sub-components
const ProcessingIndicator = ({ stage }: { stage: { message: string; isComplete: boolean } }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        if (!stage.isComplete) {
            const interval = setInterval(() => {
                setDots(prev => prev.length >= 3 ? '' : prev + '.');
            }, 500);
            return () => clearInterval(interval);
        }
    }, [stage.isComplete]);

    if (!stage.message) return null;

    return (
        <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${stage.isComplete ? 'bg-green-400' : 'bg-white animate-pulse'}`} />
            <span className="text-sm text-white/90">
                {stage.message}{stage.isComplete ? '!' : dots}
            </span>
        </div>
    );
};

const RotatingTips = ({ tipSet }: { tipSet: 'processing' | 'finalizing' }) => {

    const tips = {
        processing: [
            "💡 Tip: You can change your role later, but your script name and voice selections are final!",
            "💡 Tip: Preview how voices sound before making a selection",
            "💡 Tip: Select voices that match your character's personality",
            "⏳ Sorry, this is taking longer than expected...",
        ],
        finalizing: [
            "💡 Tip: Make sure you're in a quiet environment for the best speech recognition",
            "💡 Tip: Practice makes perfect - rehearse each scene multiple times",
            "🎬 Tip: Try different emotional approaches to find your character",
            "🎬 Tip: Take notes on your character's motivations",
            "🎯 Tip: Focus on one scene at a time for better results",
        ]
    };

    const [currentTipIndex, setCurrentTipIndex] = useState(() =>
        tipSet === "finalizing"
            ? Math.floor(Math.random() * tips.finalizing.length)
            : 0
    );

    useEffect(() => {
        // Reset start index when tipSet changes
        setCurrentTipIndex(
            tipSet === "finalizing"
                ? Math.floor(Math.random() * tips.finalizing.length)
                : 0
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipSet]);

    useEffect(() => {
        const isProcessing = tipSet === "processing";
        const isAtLastTip =
            isProcessing && currentTipIndex === tips.processing.length - 1;

        // If we're at the final processing tip, stop rotating
        if (isAtLastTip) return;

        const interval = setInterval(() => {
            setCurrentTipIndex((prev) => {
                if (isProcessing) {
                    // Stop at last index
                    return Math.min(prev + 1, tips.processing.length - 1);
                } else {
                    // Keep cycling for finalizing
                    return (prev + 1) % tips.finalizing.length;
                }
            });
        }, 4000);

        return () => clearInterval(interval);
    }, [tipSet, currentTipIndex, tips.processing.length, tips.finalizing.length]);

    return (
        <div className="mt-6 min-h-[24px] flex items-center justify-center">
            <p className="text-md text-gray-500 animate-fadeIn">
                {tips[tipSet][currentTipIndex]}
            </p>
        </div>
    );
};

const InputStage = ({
    title,
    description,
    children,
    fullHeight = false
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
    fullHeight?: boolean;
}) => {
    if (fullHeight) {
        return (
            <div className="animate-fadeIn flex flex-col h-full p-8">
                <div className="flex-shrink-0 mb-4">
                    <h3 className="text-xl font-semibold">{title}</h3>
                </div>
                <div className="flex-1 min-h-0">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <h3 className="text-xl font-semibold mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{description}</p>
            {children}
        </div>
    );
};

const RoleVoiceAssignment = ({
    role,
    voiceSamples,
    onAssign,
    isLoading = false
}: RoleVoiceAssignmentProps) => {
    const [playingUrl, setPlayingUrl] = useState<string | null>(null);
    const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const handlePlay = (url: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent selecting the voice when playing

        if (playingUrl === url) {
            audioRef.current?.pause();
            setPlayingUrl(null);
            audioRef.current = null;
        } else {
            audioRef.current?.pause();

            const audio = new Audio(url);
            audioRef.current = audio;
            setPlayingUrl(url);
            audio.play();

            audio.onended = () => {
                setPlayingUrl(null);
                audioRef.current = null;
            };
        }
    };

    const handleSelectVoice = (sample: VoiceSample) => {
        setSelectedVoiceId(sample.voiceId);
        onAssign({
            voiceId: sample.voiceId,
            voiceName: sample.name
        });
    };

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            audioRef.current?.pause();
            audioRef.current = null;
        };
    }, []);

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-500">Loading voices...</p>
            </div>
        );
    }

    if (!voiceSamples || voiceSamples.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                No voices available
            </div>
        );
    }

    return (
        <div>
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="font-medium text-blue-900">{role}</span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {voiceSamples.map(sample => (
                    <div
                        key={sample.voiceId}
                        onClick={() => handleSelectVoice(sample)}
                        className={`
                            p-4 border rounded-lg cursor-pointer transition-all
                            ${selectedVoiceId === sample.voiceId
                                ? 'border-blue-500 bg-blue-50 shadow-md'
                                : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'
                            }
                        `}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{sample.name}</h4>
                                <p className="text-sm text-gray-600 mt-1">{sample.description}</p>
                            </div>
                            <button
                                onClick={(e) => handlePlay(sample.url, e)}
                                className={`
                                    ml-4 p-2 transition-colors
                                    ${playingUrl === sample.url
                                        ? 'text-blue-600'
                                        : 'text-gray-600'
                                    }
                                `}
                            >
                                <span className="text-xl">
                                    {playingUrl === sample.url ? '⏸️' : '▶️'}
                                </span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const EditableLine = ({ item, onUpdate, onClose }: EditableLineProps) => {
    const [draftText, setDraftText] = useState(item.text);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [draftText]);

    const handleSave = () => {
        onUpdate({ ...item, text: draftText });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div className="pl-4 border-l-4 border-blue-400">
            <div className="text-base leading-relaxed">
                <textarea
                    ref={textareaRef}
                    className="w-full border rounded p-2 text-base leading-relaxed text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={onClose}
                    autoFocus
                    placeholder="Enter text..."
                />
                <div className="mt-2 flex gap-2">
                    <button
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            handleSave();
                        }}
                    >
                        Save
                    </button>
                    <button
                        className="px-3 py-1 text-sm bg-gray-400 text-white rounded hover:bg-gray-500 transition"
                        onMouseDown={(e) => {
                            e.preventDefault();
                            onClose();
                        }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const ScriptRenderer = ({
    script,
    onScriptUpdate,
    editable = false
}: ScriptRendererProps) => {
    const [editingIndex, setEditingIndex] = useState<number | null>(null);

    // Error handling if there is no parsed script here
    if (!script) return null;

    const handleLineClick = (index: number, item: ScriptElement) => {
        if (editable && item.type === 'line') {
            setEditingIndex(index);
        }
    };

    const COMMON_WORDS = new Set([
        'the', 'a', 'an', 'to', 'and', 'but', 'or', 'for', 'at', 'by', 'in', 'on', 'of', 'then', 'so'
    ]);

    function extractLineEndKeywords(text: string): string[] {
        const words = text
            .toLowerCase()
            .replace(/[^a-z0-9\s']/gi, '')
            .split(/\s+/)
            .filter(Boolean);

        // Filter out common words and duplicates
        const meaningful = words
            .filter((word, index) => {
                return (
                    !COMMON_WORDS.has(word) &&
                    words.lastIndexOf(word) === index
                );
            });

        const selected = meaningful.slice(-2);

        if (selected.length === 2) return selected;

        if (selected.length === 1) {
            const keyword = selected[0];

            // Find index of that keyword in original `words` array
            const idx = words.lastIndexOf(keyword);

            let neighbor = '';

            // Prefer word before
            if (idx > 0) {
                neighbor = words[idx - 1];
            } else {
                neighbor = words[idx + 1];
            }

            // Only return the keyword and neighbor if neighbor exists
            return neighbor ? [neighbor, keyword] : [keyword];
        }

        if (selected.length === 0 && words.length > 0) {
            return words.slice(-2);
        }

        return [];
    }

    const handleUpdate = (index: number, updatedItem: ScriptElement) => {
        // Add lineEndKeywords if it's a line element
        if (updatedItem.type === 'line' && typeof updatedItem.text === 'string') {
            updatedItem = {
                ...updatedItem,
                lineEndKeywords: extractLineEndKeywords(updatedItem.text)
            };
            console.log('Updated keywords:', updatedItem.lineEndKeywords);
        }

        const updatedScript = [...script];
        updatedScript[index] = updatedItem;
        onScriptUpdate?.(updatedScript);
        setEditingIndex(null);
    };

    const renderScriptElement = (item: ScriptElement, index: number) => {
        const isEditing = editingIndex === index;

        switch (item.type) {
            case 'scene':
                return (
                    <div key={index} className="mb-6">
                        <div className="font-bold text-gray-800 uppercase tracking-wide">
                            {item.text}
                        </div>
                    </div>
                );

            case 'line':
                if (isEditing) {
                    return (
                        <div key={index} className="mb-4 mx-4 sm:mx-8 lg:mx-12">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900 uppercase tracking-wide text-center mb-2">
                                    {item.character}
                                </span>
                                <EditableLine
                                    item={item}
                                    onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
                                    onClose={() => setEditingIndex(null)}
                                />
                            </div>
                        </div>
                    );
                }

                return (
                    <div
                        key={index}
                        className={`mb-4 mx-4 sm:mx-8 lg:mx-12 ${editable ? 'cursor-pointer hover:bg-gray-100 border-gray-200 hover:shadow-sm rounded-lg p-2 transition-colors' : ''
                            }`}
                        onClick={() => handleLineClick(index, item)}
                    >
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-900 uppercase tracking-wide text-center mb-1">
                                {item.character}
                            </span>
                            <div className="text-gray-800 leading-relaxed pl-4 relative group">
                                {item.text}
                            </div>
                        </div>
                    </div>
                );

            case 'direction':
                return (
                    <div key={index} className="mb-4 mx-6 sm:mx-12 lg:mx-16">
                        <div className="text-gray-600 italic">
                            ({item.text})
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="space-y-3">
            {script.map((item, index) => renderScriptElement(item, index))}
        </div>
    );
};