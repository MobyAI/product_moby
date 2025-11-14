import { useEffect, useState } from "react";

interface CountdownTimerProps {
    duration: number; // in milliseconds
    onComplete?: () => void;
    isDarkMode: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ duration, onComplete, isDarkMode }) => {
    const [timeLeft, setTimeLeft] = useState(duration);

    useEffect(() => {
        if (timeLeft <= 0) {
            onComplete?.();
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 100));
        }, 100);

        return () => clearInterval(interval);
    }, [timeLeft, onComplete]);

    const displayTime = () => {
        if (timeLeft >= 1000) {
            // 1 second or more: show whole seconds
            return `${Math.ceil(timeLeft / 1000)}s`;
        } else {
            // Below 1 second: show one decimal place
            return `${(timeLeft / 1000).toFixed(1)}s`;
        }
    };

    return (
        <div className={`flex items-center text-sm px-3 py-1.5 rounded shadow-md ${isDarkMode
                ? "text-primary-dark bg-primary-light"
                : "bg-primary-dark text-primary-light"
            }`}>
            <span className="font-semibold">
                {displayTime()}
            </span>
        </div>
    );
};