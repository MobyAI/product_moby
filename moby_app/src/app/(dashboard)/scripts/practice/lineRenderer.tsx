import React, { useEffect, useRef } from 'react';
import type { ScriptElement } from "@/types/script";

interface OptimizedLineRendererProps {
    element: ScriptElement;
    isCurrent: boolean;
    isWaitingForUser: boolean;
    spanRefMap: Map<number, HTMLSpanElement[]>;
    matchedCount: number;
    isCompleted: boolean;
}

const BASE = "word text-gray-700 transition-all duration-100";
const MATCHED = "matched";
const WAITING = "waiting";

export const OptimizedLineRenderer = React.memo<OptimizedLineRendererProps>(({
    element,
    isCurrent,
    isWaitingForUser,
    spanRefMap,
    matchedCount,
    isCompleted
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const words = React.useMemo(() => element.text.split(/\s+/), [element.text]);

    // Collect spans when becoming current
    useEffect(() => {
        if (!isCurrent || !containerRef.current) return;

        const spans = Array.from(
            containerRef.current.querySelectorAll('span[data-word-index]')
        ) as HTMLSpanElement[];

        spanRefMap.set(element.index, spans);
    }, [isCurrent, element.index, spanRefMap]);

    // Non-user lines
    if (element.role !== "user") {
        return (
            <div className="pl-4 border-l-3 border-gray-300">
                <p className="text-base leading-relaxed text-gray-700 px-[2px] py-[5px]">
                    {element.text}
                </p>
            </div>
        );
    }

    // User lines with word spans
    const containerClasses = `pl-4 border-l-3 border-gray-300 ${isWaitingForUser && isCurrent ? WAITING : ''
        }`;

    return (
        <div className={containerClasses} ref={containerRef}>
            <div className="text-base leading-relaxed">
                {words.map((word, i) => {
                    const isMatched = isCompleted || (isCurrent && i < matchedCount) || (!isCurrent && i < matchedCount);
                    const spanClasses = `${BASE} ${isMatched ? MATCHED : ''}`;

                    return (
                        <span
                            key={i}
                            data-word-index={i}
                            className={spanClasses}
                        >
                            {word + ' '}
                        </span>
                    );
                })}
            </div>
        </div>
    );
});

OptimizedLineRenderer.displayName = "OptimizedLineRenderer";