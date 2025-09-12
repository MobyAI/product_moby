import { useEffect, useState } from "react";
import { Hourglass } from "lucide-react";

interface CountdownTimerProps {
    duration: number; // in milliseconds
    onComplete?: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ duration, onComplete }) => {
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

    const seconds = Math.ceil(timeLeft / 1000);

    return (
        <div className="flex items-center text-sm text-white bg-gray-900 px-3 py-1.5 rounded shadow-md">
            <span className="font-semibold">
                {seconds}s
            </span>
        </div>
    );
};