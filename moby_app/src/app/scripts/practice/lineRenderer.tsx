import React, { useEffect, useMemo, useRef } from 'react';
import type { ScriptElement } from "@/types/script";

interface OptimizedLineRendererProps {
    element: ScriptElement;
    isCurrent: boolean;
    isWaitingForUser: boolean;
    spanRefMap: React.MutableRefObject<Map<number, HTMLSpanElement[]>>;
    matchedCount: number;
}

export const OptimizedLineRenderer = React.memo<OptimizedLineRendererProps>(({
    element,
    isCurrent,
    isWaitingForUser,
    spanRefMap,
    matchedCount
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const words = useMemo(() => element.text.split(/\s+/), [element.text]);

    useEffect(() => {
        if (isCurrent && containerRef.current) {
            const spans = Array.from(containerRef.current.querySelectorAll('span[data-word-index]')) as HTMLSpanElement[];
            spanRefMap.current.set(element.index, spans);
        }
    }, [isCurrent, spanRefMap, element.index]);

    useEffect(() => {
        const spans = spanRefMap.current.get(element.index);
        if (!spans) return;

        spans.forEach((span, i) => {
            if (i < matchedCount) {
                span.className = "font-bold text-gray-900 transition-all duration-100";
            } else if (isWaitingForUser && isCurrent) {
                span.className = "text-blue-900 font-medium transition-all duration-100";
            } else {
                span.className = "text-gray-700 transition-all duration-100";
            }
        });
    }, [matchedCount, isCurrent, isWaitingForUser, spanRefMap, element.index]);

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
        <div className="pl-4 border-l-3 border-gray-300" ref={containerRef}>
            <div className="text-base leading-relaxed">
                {words.map((word, i) => (
                    <span key={i} data-word-index={i} className="text-gray-700 transition-all duration-100">
                        {word + ' '}
                    </span>
                ))}
            </div>
        </div>
    );
});