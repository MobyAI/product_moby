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
        text: string;
        duration: number;
        icon: string;
    }> = [
            {
                text: "This may take up to a few minutes. We appreciate your patience!",
                duration: 5000,
                icon: "⏳"
            },
            {
                text: "While you wait, here are some things you can do to prepare.",
                duration: 5000,
                icon: "💡"
            },
            {
                text: "Did you know, you can add audio tags to change how your lines are read? Simply click on the line you want to edit, and insert the tag anywhere within the line by pressing the open bracket ( [ ) key. Press save and the audio will regenerate!",
                duration: 10000,
                icon: "🎭"
            },
            {
                text: "Audio tags can be simple, one word descriptors like: excited, curious, sarcastic. Or even things like: laughs, sighs, giggles, gasps. This gives you control over how each line is read by your scene partner.",
                duration: 10000,
                icon: "🎯"
            },
            {
                text: "You can also add delays after each scene header, direction, or line by clicking on the scene element and choosing a value (in seconds). This gives you control over the speed of the dialogue and overall flow of the scene.",
                duration: 10000,
                icon: "⏱️"
            },
            {
                text: "There are also advanced settings that you can use to further customize the flow of your rehearsal and change the character that you're reading for. You can even read for multiple characters if you want!",
                duration: 10000,
                icon: "⚙️"
            },
            {
                text: "Hang tight, we're almost done setting up your scene for you!",
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
    }, [currentTipIndex, isLoading]);

    const currentTip = tips[currentTipIndex];
    const circumference = 2 * Math.PI * 8; // radius = 8 for 20x20 svg
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 relative overflow-hidden">
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
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {currentTip.text}
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