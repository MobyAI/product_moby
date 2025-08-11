import React, { useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import type { ScriptElement } from "@/types/script";

interface OptimizedLineRendererProps {
    element: ScriptElement;
    isCurrent: boolean;
    isWaitingForUser: boolean;
    spanRefMap: Map<number, HTMLSpanElement[]>;
    matchedCount: number;
}

const BASE = "word text-gray-700 transition-all duration-100";
const MATCHED = "matched";
const WAITING = "waiting";

export const OptimizedLineRenderer = React.memo<OptimizedLineRendererProps>(({
    element,
    isCurrent,
    isWaitingForUser,
    spanRefMap,
    matchedCount
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const prevCountRef = useRef<number>(0);
    const scheduledRef = useRef<number | null>(null);
    const pendingCountRef = useRef<number>(matchedCount);

    const words = useMemo(() => element.text.split(/\s+/), [element.text]);

    // 1) Collect spans once per current line + initialize base class once
    useEffect(() => {
        if (!isCurrent || !containerRef.current) return;

        const spans = Array.from(
            containerRef.current.querySelectorAll('span[data-word-index]')
        ) as HTMLSpanElement[];

        spanRefMap.set(element.index, spans);

        prevCountRef.current = 0;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCurrent, element.index]);

    // 2) Flip "waiting" on the container
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.classList.toggle(WAITING, isWaitingForUser && isCurrent);
    }, [isWaitingForUser, isCurrent]);

    // 3) Minimal DOM writes for matched/unmatched: only toggle the delta
    useLayoutEffect(() => {
        // store latest count; multiple updates per frame will overwrite this
        pendingCountRef.current = matchedCount;

        // if an rAF is already scheduled, do nothing — it will pick up the latest count
        if (scheduledRef.current != null) return;

        scheduledRef.current = requestAnimationFrame(() => {
            scheduledRef.current = null;

            const spans = spanRefMap.get(element.index);
            if (!spans || spans.length === 0) return;

            const prev = prevCountRef.current;
            const next = Math.max(0, Math.min(pendingCountRef.current, spans.length));
            if (next === prev) return;

            if (next > prev) {
                for (let i = prev; i < next; i++) spans[i].classList.add(MATCHED);
            } else {
                for (let i = next; i < prev; i++) spans[i].classList.remove(MATCHED);
            }

            prevCountRef.current = next;
        });

        // cancel if the component unmounts or deps change before the frame runs
        return () => {
            if (scheduledRef.current != null) {
                cancelAnimationFrame(scheduledRef.current);
                scheduledRef.current = null;
            }
        };
    }, [matchedCount, element.index]);


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
                    <span key={i} data-word-index={i} className={BASE}>
                        {word + ' '}
                    </span>
                ))}
            </div>
        </div>
    );
});

OptimizedLineRenderer.displayName = "OptimizedLineRenderer";