import React, { useState, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase/client/config/app';
import { onAuthStateChanged } from 'firebase/auth';
import { extractScriptText } from '@/lib/api/parse/extract';
import { extractRolesFromText } from '@/lib/api/parse/roles';
import { parseScriptFromText } from '@/lib/api/parse/parse';
import { ScriptElement } from '@/types/script';
import { getAllVoiceSamples } from '@/lib/firebase/client/tts';

// Add proper error handling! Especially for api calls. What to do if failed?

interface ScriptUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    file: File | null;
    onComplete: (data: ScriptElement) => void;
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

export default function ScriptUploadModal({
    isOpen,
    onClose,
    file,
    onComplete
}: ScriptUploadModalProps) {
    // Core State
    const [currentStage, setCurrentStage] = useState(0);
    const [extractedText, setExtractedText] = useState<ExtractedTextResult | null>(null);
    const [extractedRoles, setExtractedRoles] = useState<string[] | null>([]);
    const [parsedScript, setParsedScript] = useState<ScriptElement | null>(null);

    // User Inputs State
    const [scriptName, setScriptName] = useState('');
    const [roleAssignments, setRoleAssignments] = useState({});
    const [userRole, setUserRole] = useState('');

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
    const [processingStage, setProcessingStage] = useState('');
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
        setProcessingStage('');
        setIsParsingInBackground(false);
        setIsTransitioning(false);
    };

    // Reset when modal closes
    const handleClose = () => {
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
            setProcessingStage('Extracting text from document...');
            setCurrentStage(1);

            // TODO: Replace with actual API call
            const textResult = await extractScriptText(file);
            setExtractedText(textResult);

            // Stage 2: Extract Roles (automatic)
            setProcessingStage('Identifying characters...');
            const rolesResult = await extractRolesFromText(textResult.text);
            setExtractedRoles(rolesResult);
            setCurrentStage(2); // Move to name input

            // Stage 3: Start parsing in background
            setIsParsingInBackground(true);
            setProcessingStage('Parsing script structure...');
            parseScriptFromText(textResult.text).then(result => {
                setParsedScript(result);
                setIsParsingInBackground(false);
                setProcessingStage('Script parsing complete');
            });

        } catch (error) {
            console.error('Processing error:', error);
            setProcessingStage('Error occurred');
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

    // const moveToPreviousStage = () => {
    //     setIsTransitioning(true);
    //     setTimeout(() => {
    //         setCurrentStage(prev => prev - 1);
    //         setIsTransitioning(false);
    //     }, 300);
    // };

    // Check if can proceed to completion
    const canComplete = () => {
        return scriptName &&
            Object.keys(roleAssignments).length === extractedRoles?.length &&
            Object.keys(voiceAssignments).length === extractedRoles?.length &&
            userRole &&
            parsedScript;
    };

    const handleComplete = () => {
        console.log('handle complete: ', parsedScript);
        console.log('script name: ', scriptName);
        console.log('voice assignments: ', voiceAssignments);
        console.log('role assignments: ', roleAssignments);
        console.log('user role: ', userRole);

        // const combinedData = {
        //     scriptName,
        //     extractedText,
        //     extractedRoles,
        //     parsedScript,
        //     roleAssignments,
        //     voiceAssignments,
        //     userRole
        // };
        // onComplete(combinedData);
        // resetModal();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div
                ref={modalRef}
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
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
                            className="text-white/80 hover:text-white text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Content Area with Progressive Inputs */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className={`transition-all duration-300 ${isTransitioning ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'}`}>

                        {/* Stage 1: Loading */}
                        {currentStage === 1 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 mx-auto mb-4">
                                    <div className="w-full h-full border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                                </div>
                                <p className="text-gray-600">Processing your script...</p>
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
                            <InputStage
                                title="Assign Voices"
                                description={`Character ${Object.keys(voiceAssignments).length + 1} of ${extractedRoles.length}`}
                            >
                                <RoleVoiceAssignment
                                    key={extractedRoles[Object.keys(voiceAssignments).length]}
                                    role={extractedRoles[Object.keys(voiceAssignments).length]}
                                    voiceSamples={voiceSamples}
                                    isLoading={voicesLoading}
                                    onAssign={(assignment) => {
                                        const currentRole = extractedRoles[Object.keys(voiceAssignments).length];
                                        // Show confirmation modal instead of immediately assigning
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
                                        <div className="relative bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl pointer-events-auto">
                                            <h3 className="text-lg font-semibold mb-3">Confirm Voice Selection</h3>
                                            <p className="text-gray-600 mb-4">
                                                Assign <span className="font-medium">{confirmationModal.assignment.voiceName}</span> to <span className="font-medium">{confirmationModal.role}</span>?
                                            </p>
                                            <p className="text-sm text-red-500 mb-6">
                                                This selection cannot be changed later.
                                            </p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setConfirmationModal(null)}
                                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
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

                                                        // Auto-advance after confirmation
                                                        setTimeout(() => {
                                                            if (Object.keys(voiceAssignments).length + 1 === extractedRoles.length) {
                                                                moveToNextStage();
                                                            }
                                                        }, 300);
                                                    }}
                                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                                >
                                                    Confirm
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </InputStage>
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
                                                const assignments: Record<string, string> = {};
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
                                    <>
                                        <div className="w-16 h-16 mx-auto mb-4">
                                            <div className="w-full h-full border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                                        </div>
                                        <p className="text-gray-600 mb-2">Finalizing your script...</p>
                                        <p className="text-sm text-gray-500">This may take a moment</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 mx-auto mb-4 text-green-500">
                                            <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold mb-2">Script Ready!</h3>
                                        <p className="text-gray-600 mb-6">Your script has been processed successfully</p>
                                        <button
                                            onClick={handleComplete}
                                            disabled={!canComplete}
                                            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition"
                                        >
                                            Start Rehearsing
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Progress Indicators */}
                <div className="px-6 pb-4">
                    <div className="flex justify-center space-x-2">
                        {[1, 2, 3, 4, 5].map(stage => (
                            <div
                                key={stage}
                                className={`w-2 h-2 rounded-full transition-all ${currentStage >= stage ? 'bg-blue-600 w-8' : 'bg-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components
const ProcessingIndicator = ({ stage }: { stage: string }) => {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.');
        }, 500);
        return () => clearInterval(interval);
    }, []);

    if (!stage) return null;

    return (
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-sm text-white/90">{stage}{dots}</span>
        </div>
    );
};

const InputStage = ({ title, description, children }: {
    title: string;
    description: string;
    children: React.ReactNode;
}) => {
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