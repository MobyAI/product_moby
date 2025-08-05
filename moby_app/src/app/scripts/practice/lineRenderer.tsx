import React, { useMemo } from 'react';
import type { ScriptElement } from "@/types/script";

interface OptimizedLineRendererProps {
    element: ScriptElement;
    spokenWordCount: number;
    isCurrent: boolean;
    isWaitingForUser: boolean;
}

export const OptimizedLineRenderer = React.memo<OptimizedLineRendererProps>(({
    element,
    spokenWordCount,
    isCurrent,
    isWaitingForUser
}) => {
    const words = useMemo(() => element.text.split(/\s+/), [element.text]);

    const wordSpans = useMemo(() => {
        return words.map((word, i) => {
            const isMatched = i < spokenWordCount;
            const isWaiting = isCurrent && isWaitingForUser && !isMatched;

            const className = `${isMatched
                ? "font-bold text-gray-900"
                : isWaiting
                    ? "text-blue-900 font-medium"
                    : "text-gray-700"
                } transition-all duration-150`;

            return (
                <span key={i} className={className}>
                    {word + " "}
                </span>
            );
        });
    }, [words, spokenWordCount, isCurrent, isWaitingForUser]);

    if (element.role !== "user") {
        return (
            <div className="pl-4 border-l-3 border-gray-300">
                <p className="text-base leading-relaxed text-gray-700">
                    {element.text}
                </p>
            </div>
        );
    }

    return (
        <div className="pl-4 border-l-3 border-gray-300">
            <div className="text-base leading-relaxed">
                {wordSpans}
            </div>
        </div>
    );
});