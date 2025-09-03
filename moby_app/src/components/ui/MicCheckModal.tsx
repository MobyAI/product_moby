import React, { useState, useEffect, useRef } from "react";
import { Volume2, Mic, ChevronRight, AlertCircle, X } from "lucide-react";
import { useMicTest } from "@/lib/google/micTest";
import { CheckMark } from "@/components/ui";

interface AudioDevice {
    deviceId: string;
    label: string;
}

interface AudioSetupModalProps {
    isOpen: boolean;
    onComplete: () => void;
    scriptId?: string;
}

interface CompletedSetups {
    [scriptId: string]: boolean;
}

// Extend HTMLMediaElement to include setSinkId for TypeScript
interface HTMLAudioElementWithSinkId extends HTMLAudioElement {
    setSinkId(sinkId: string): Promise<void>;
}

export const MicCheckModal: React.FC<AudioSetupModalProps> = ({
    isOpen,
    onComplete,
    scriptId
}) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedSpeaker, setSelectedSpeaker] = useState<string>('default');
    const [speakers, setSpeakers] = useState<AudioDevice[]>([
        { deviceId: 'default', label: 'Default Speaker' }
    ]);
    const [microphones, setMicrophones] = useState<AudioDevice[]>([]);
    const [selectedMic, setSelectedMic] = useState<string>('default');
    const [speakerTestPlayed, setSpeakerTestPlayed] = useState<boolean>(false);
    const [micPermissionError, setMicPermissionError] = useState<boolean>(false);

    const { startMicTest, stopMicTest, transcript, isListening, cleanup, error: micError } = useMicTest();
    const audioRef = useRef<HTMLAudioElementWithSinkId | null>(null);

    // Check if setup was already completed for this script
    useEffect(() => {
        if (scriptId) {
            try {
                const storedSetups = localStorage.getItem('audioSetupsCompleted');
                const completedSetups: CompletedSetups = storedSetups ? JSON.parse(storedSetups) : {};
                if (completedSetups[scriptId]) {
                    onComplete();
                }
            } catch (err) {
                console.error('Error reading localStorage:', err);
            }
        }
    }, [scriptId, onComplete]);

    // Get available audio devices
    useEffect(() => {
        const getDevices = async (): Promise<void> => {
            try {
                // Request permissions first
                await navigator.mediaDevices.getUserMedia({ audio: true });

                const devices = await navigator.mediaDevices.enumerateDevices();

                const audioOutputs: AudioDevice[] = devices
                    .filter(device => device.kind === 'audiooutput')
                    .map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || `Speaker ${device.deviceId.substring(0, 5)}`
                    }));

                const audioInputs: AudioDevice[] = devices
                    .filter(device => device.kind === 'audioinput')
                    .map(device => ({
                        deviceId: device.deviceId,
                        label: device.label || `Microphone ${device.deviceId.substring(0, 5)}`
                    }));

                if (audioOutputs.length > 0) {
                    setSpeakers(audioOutputs);
                    setSelectedSpeaker(audioOutputs[0].deviceId);
                }

                if (audioInputs.length > 0) {
                    setMicrophones(audioInputs);
                    setSelectedMic(audioInputs[0].deviceId);
                }
            } catch (err) {
                console.error('Error getting devices:', err);
                setMicPermissionError(true);
            }
        };

        if (isOpen) {
            getDevices();
        }
    }, [isOpen]);

    const playTestSound = async (): Promise<void> => {
        if (!audioRef.current) return;

        try {
            // Check if setSinkId is available
            if ('setSinkId' in audioRef.current && typeof audioRef.current.setSinkId === 'function') {
                await audioRef.current.setSinkId(selectedSpeaker);
            }
            await audioRef.current.play();
            setSpeakerTestPlayed(true);
        } catch (err) {
            console.error('Error playing test sound:', err);
            // Fallback to default speaker
            try {
                await audioRef.current.play();
                setSpeakerTestPlayed(true);
            } catch (playErr) {
                console.error('Error playing audio:', playErr);
            }
        }
    };

    const handleMicTest = (): void => {
        if (isListening) {
            stopMicTest();
        } else {
            startMicTest();
        }
    };

    const handleContinue = (): void => {
        if (step === 1 && speakerTestPlayed) {
            setStep(2);
        } else if (step === 2 && transcript) {
            // Mark setup as complete for this script
            if (scriptId) {
                try {
                    const storedSetups = localStorage.getItem('audioSetupsCompleted');
                    const completedSetups: CompletedSetups = storedSetups ? JSON.parse(storedSetups) : {};
                    completedSetups[scriptId] = true;
                    localStorage.setItem('audioSetupsCompleted', JSON.stringify(completedSetups));
                } catch (err) {
                    console.error('Error saving to localStorage:', err);
                }
            }
            cleanup();
            onComplete();
        }
    };

    const handleBack = (): void => {
        if (step === 2) {
            stopMicTest();
            setStep(1);
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        setSelectedSpeaker(e.target.value);
        setSpeakerTestPlayed(false);
    };

    // Help Tooltip Component
    const HelpTooltip: React.FC<{ section: 'speaker' | 'mic' }> = ({ section }) => {
        const [isVisible, setIsVisible] = useState(false);

        return (
            <div className="relative inline-block">
                <button
                    type="button"
                    onClick={() => setIsVisible(!isVisible)}
                    className="text-blue-600 hover:text-blue-700 underline text-sm focus:outline-none"
                >
                    Need help?
                </button>

                {isVisible && (
                    <>
                        {/* Backdrop to close tooltip when clicking outside */}
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsVisible(false)}
                        />

                        {/* Tooltip content */}
                        <div className="absolute bottom-full left-0 mb-2 w-80 p-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                            <button
                                onClick={() => setIsVisible(false)}
                                className="absolute top-2 right-2 p-1 hover:bg-gray-100 rounded transition-colors"
                                aria-label="Close help"
                            >
                                <X className="w-4 h-4 text-gray-500" />
                            </button>

                            {section === 'speaker' ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Volume2 className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-semibold text-gray-900">Speaker Troubleshooting</h4>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-700">
                                        <div>
                                            <p className="font-medium text-gray-900 mb-1">{"Can't hear the test sound?"}</p>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>{"Check your system volume isn't muted"}</li>
                                                <li>{"Ensure correct speaker is selected"}</li>
                                                <li>{"Try refreshing the page"}</li>
                                                <li>{"Test sound in another browser tab"}</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <p className="font-medium text-gray-900 mb-1">{"Speaker not listed?"}</p>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>{"Reconnect your audio device"}</li>
                                                <li>{"Grant browser permission for audio"}</li>
                                                <li>{"Restart your browser"}</li>
                                            </ul>
                                        </div>

                                        <div className="pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-600">
                                                <strong>Note:</strong> {`The test sound is a simple tone. If you don't hear it after pressing "Test", check your system audio settings.`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Mic className="w-4 h-4 text-blue-600" />
                                        <h4 className="font-semibold text-gray-900">Microphone Troubleshooting</h4>
                                    </div>

                                    <div className="space-y-2 text-sm text-gray-700">
                                        <div>
                                            <p className="font-medium text-gray-900 mb-1">{"Microphone not working?"}</p>
                                            <ul className="list-disc list-inside space-y-1 text-xs">
                                                <li>{"Allow microphone access when prompted"}</li>
                                                <li>{"Ensure mic isn't muted (check for mute button)"}</li>
                                                <li>{"Close other apps using the microphone"}</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <p className="font-medium text-gray-900 mb-1">Browser Permissions</p>
                                            <div className="space-y-1 text-xs">
                                                <p><strong>Chrome:</strong>{" Click lock icon → Site settings → Microphone"}</p>
                                                <p><strong>Firefox:</strong>{" Click lock icon → Connection secure → More info"}</p>
                                                <p><strong>Safari:</strong>{" Safari menu → Settings → Websites → Microphone"}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="relative w-full max-w-xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-10">
                    {/* Step 1: Speaker Test */}
                    {step === 1 && (
                        <>
                            <h2 className="text-2xl font-semibold mb-2">First, a quick audio check.</h2>
                            <div className="text-gray-600 mb-6">
                                {"Let's test if your speakers are working.  "}
                                <HelpTooltip section="speaker" />
                            </div>

                            <div className="flex items-center gap-3 mb-4">
                                <select
                                    value={selectedSpeaker}
                                    onChange={handleSelectChange}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="Select speaker device"
                                >
                                    {speakers.map(speaker => (
                                        <option key={speaker.deviceId} value={speaker.deviceId}>
                                            {speaker.label}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={playTestSound}
                                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center gap-2"
                                    aria-label="Test speaker"
                                >
                                    <Volume2 className="w-4 h-4" />
                                    Test
                                </button>
                            </div>

                            {speakerTestPlayed && (
                                <div className="flex items-center gap-2 text-green-600 mb-4">
                                    <CheckMark className="w-8 h-8" />
                                    <span className="text-md">Speakers are good to go!</span>
                                </div>
                            )}

                            <button
                                onClick={handleContinue}
                                disabled={!speakerTestPlayed}
                                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${speakerTestPlayed
                                    ? 'bg-green-300 text-green-800 hover:bg-green-400'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                aria-label="Continue to microphone test"
                            >
                                Continue
                                <ChevronRight className="w-4 h-4" />
                            </button>

                            <audio
                                ref={audioRef as React.RefObject<HTMLAudioElement>}
                                src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi11yu7Yii4IJm7A7OGdUg0PUqzn5LtuGQU7l9z0xHkpBSl+zPTXjzsIHGS58OScTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTTTgwOT6Xf8fTT"
                            />
                        </>
                    )}

                    {/* Step 2: Microphone Test */}
                    {step === 2 && (
                        <>
                            <h2 className="text-2xl font-semibold mb-2">{"Next, let's test your mic."}</h2>
                            <div className="text-gray-600 mb-6">
                                {`Tap "Test Microphone" and say a few words.  `}
                                <HelpTooltip section="mic" />
                            </div>

                            <button
                                onClick={handleMicTest}
                                className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4 ${isListening
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-black text-white hover:bg-gray-800'
                                    }`}
                                aria-label={isListening ? 'Stop recording' : 'Start microphone test'}
                            >
                                <Mic className="w-4 h-4" />
                                {isListening ? 'Stop Recording' : 'Test Microphone'}
                            </button>

                            <div className="min-h-[60px] p-4 bg-gray-50 rounded-lg mb-4">
                                <p className="text-gray-500">
                                    {transcript || (isListening ? 'Listening...' : '✨ Your words will appear here ✨')}
                                </p>
                            </div>

                            {micError && (
                                <div className="text-red-600 text-sm mb-4">
                                    {micError}
                                </div>
                            )}

                            <p className="text-sm text-gray-600 mb-6">
                                Using {microphones.find(m => m.deviceId === selectedMic)?.label || 'Default Microphone'}.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleBack}
                                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                                    aria-label="Back to speaker test"
                                >
                                    Back
                                </button>

                                <button
                                    onClick={handleContinue}
                                    disabled={!transcript}
                                    className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${transcript
                                        ? 'bg-green-300 text-green-800 hover:bg-green-400'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                    aria-label="Complete audio setup"
                                >
                                    Continue
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}

                    {/* Step 3: Success */}
                    {/* {step === 3 && (
                        <div className="flex flex-1 items-center justify-center gap-2">
                            <CheckMark className="w-10 h-10" />
                            <span className="text-xl">Audio check success!</span>
                        </div>
                    )} */}
                </div>

                {/* Error Messages */}
                {micPermissionError && (
                    <div className="absolute bottom-0 left-0 right-0 transform translate-y-full mt-4">
                        <div className="bg-white rounded-lg shadow-lg p-4 mx-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-gray-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-gray-900">
                                    {"Can't access microphone"}
                                </p>
                                <p className="text-sm text-gray-600 mt-1">
                                    {"Check your browser settings, and refresh the page. If that doesn't work, try restarting your browser."}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};