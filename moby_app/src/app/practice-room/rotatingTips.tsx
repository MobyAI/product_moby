import React, { useState, useEffect, useRef } from 'react';

interface LoadingTipsProps {
    isLoading?: boolean;
}

const LoadingTips: React.FC<LoadingTipsProps> = ({ isLoading = true }) => {
    const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);
    const [isAnimating, setIsAnimating] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(100);
    const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const tips: Array<{
        content: React.ReactNode;
        duration: number;
        icon: string;
    }> = [
            {
                content: (
                    <>
                        This may take up to a few minutes.
                        <br />
                        <span className="text-gray-300">We appreciate your patience!</span>
                    </>
                ),
                duration: 5000,
                icon: "⏳"
            },
            {
                content: (
                    <>
                        While you wait, here are some things you can do to prepare!
                    </>
                ),
                duration: 5000,
                icon: "💡"
            },
            {
                content: (
                    <>
                        <span className="font-semibold">Did you know?</span>
                        <br />
                        You can add <span className="text-yellow-400 font-semibold">audio tags</span> to change how your lines are read!
                        <br />
                        <span className="text-gray-200">
                            {"Click on a line to edit → Press [ to auto-insert tag anywhere → Save"}
                        </span>
                    </>
                ),
                duration: 10000,
                icon: "🎭"
            },
            {
                content: (
                    <>
                        Audio tags can be simple descriptors:
                        <br />
                        <span className="text-yellow-400">excited</span>, <span className="text-yellow-400">curious</span>, <span className="text-yellow-400">sarcastic</span>
                        <br />
                        Or actions: <span className="text-yellow-400">laughs</span>, <span className="text-yellow-400">sighs</span>, <span className="text-yellow-400">gasps</span>
                    </>
                ),
                duration: 10000,
                icon: "🎯"
            },
            {
                content: (
                    <>
                        <span className="font-semibold">Control the pace!</span>
                        <br />
                        Add <span className="text-yellow-400 font-semibold">delays</span> after any line or scene direction.
                        <br />
                        <span className="text-gray-200">Click element → Choose delay in seconds</span>
                    </>
                ),
                duration: 10000,
                icon: "⏱️"
            },
            {
                content: (
                    <>
                        <span className="text-yellow-400 font-semibold">Pro tip:</span> Check the advanced settings in the control panel to the left.
                        <br />
                        You can further customize your practice room and even <span className="underline">read multiple characters</span> if you want!
                    </>
                ),
                duration: 10000,
                icon: "⚙️"
            },
            {
                content: (
                    <span>
                        {"Hang tight, we're almost done!"}
                    </span>
                ),
                duration: Infinity,
                icon: "🚀"
            }
        ];

    useEffect(() => {
        if (!isLoading) {
            if (intervalRef.current) clearTimeout(intervalRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
            return;
        }

        const startNewTip = () => {
            const currentTip = tips[currentTipIndex];

            // Don't advance if we're on the last tip
            if (currentTipIndex === tips.length - 1) {
                return;
            }

            // Reset progress to 100%
            setProgress(100);

            // Start progress countdown
            const progressUpdateInterval = 50; // Update every 50ms for smooth animation
            let elapsed = 0;

            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

            progressIntervalRef.current = setInterval(() => {
                elapsed += progressUpdateInterval;
                const remaining = Math.max(0, 100 - (elapsed / currentTip.duration) * 100);
                setProgress(remaining);

                if (remaining === 0) {
                    clearInterval(progressIntervalRef.current);
                }
            }, progressUpdateInterval);

            // Set timeout for next tip
            if (intervalRef.current) clearTimeout(intervalRef.current);

            intervalRef.current = setTimeout(() => {
                setIsAnimating(true);
                setTimeout(() => {
                    setCurrentTipIndex(prev => Math.min(prev + 1, tips.length - 1));
                    setIsAnimating(false);
                }, 300);
            }, currentTip.duration);
        };

        startNewTip();

        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current);
            if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentTipIndex, isLoading]);

    const currentTip = tips[currentTipIndex];
    const circumference = 2 * Math.PI * 8; // radius = 8 for 20x20 svg
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 relative overflow-hidden">
            {/* Circular Progress Indicator - Top Right */}
            <div className="absolute top-3 right-3 z-10">
                <svg width="20" height="20" className="transform -rotate-90">
                    {/* Background circle */}
                    {/* <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke="rgb(55, 65, 81)"
                        strokeWidth="2"
                        fill="none"
                    /> */}
                    {/* Progress circle */}
                    <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke="rgb(59, 130, 246)"
                        strokeWidth="3"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-100 ease-linear"
                    />
                </svg>
            </div>

            {/* Tip Content */}
            <div className="pr-8"> {/* Add padding-right to account for progress circle */}
                <div className="min-h-[80px] sm:min-h-[35px] mb-4">
                    <div
                        className={`transition-all duration-300 ease-out ${isAnimating
                            ? '-translate-x-full opacity-0'
                            : 'translate-x-0 opacity-100'
                            }`}
                    >
                        <p className="text-sm text-white leading-relaxed">
                            {currentTip.content}
                        </p>
                    </div>
                </div>
            </div>

            {/* Step indicator dots */}
            {/* <div className="flex items-center justify-center gap-1.5">
                {tips.map((_, index) => (
                    <div
                        key={index}
                        className={`h-1.5 rounded-full transition-all duration-300 ${index === currentTipIndex
                                ? 'w-4 bg-blue-500'
                                : index < currentTipIndex
                                    ? 'w-1.5 bg-blue-700'
                                    : 'w-1.5 bg-gray-600'
                            }`}
                    />
                ))}
            </div> */}
        </div>
    );
};

export default LoadingTips;