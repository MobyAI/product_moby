import React, { useEffect, useRef } from 'react';
import type { ScriptElement } from "@/types/script";

interface OptimizedLineRendererProps {
    element: ScriptElement;
    isCurrent: boolean;
    isWaitingForUser: boolean;
    spanRefMap: Map<number, HTMLSpanElement[]>;
    matchedCount: number;
    isCompleted: boolean;
    isDarkMode: boolean;
}

interface ParsedSegment {
    type: 'word' | 'other';
    content: string;
    wordIndex?: number; // Only for words, not audio tags
}

export const OptimizedLineRenderer = React.memo<OptimizedLineRendererProps>(({
    element,
    isCurrent,
    isWaitingForUser,
    spanRefMap,
    matchedCount,
    isCompleted,
    isDarkMode,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Style classnames
    const BASE = `word transition-all duration-100${isDarkMode ? 'text-primary-light' : 'text-primary-dark' }`;
    const MATCHED = isDarkMode ? 'matched-dark' : 'matched-light';
    const WAITING = isDarkMode ? 'waiting-dark' : 'waiting-light';

    // Parse text to separate words and audio tags
    const segments = React.useMemo(() => {
        const parsed: ParsedSegment[] = [];
        const regex = /(\[[^\]]+\]|\([^)]*\))|([^\s\[\]()]+)/g;
        let match;
        let wordIndex = 0;

        while ((match = regex.exec(element.text)) !== null) {
            if (match[1]) {
                // This is anything in brackets - Not meant to be read out loud and matched
                parsed.push({
                    type: 'other',
                    content: match[1]
                });
            } else if (match[2]) {
                // This is a regular word
                parsed.push({
                    type: 'word',
                    content: match[2],
                    wordIndex: wordIndex++
                });
            }
        }

        return parsed;
    }, [element.text]);

    // Helper function to parse text for non-user lines (without word indexing)
    const parseNonUserText = React.useMemo(() => {
        const parsed: { type: 'text' | 'other'; content: string }[] = [];
        const regex = /(\[[^\]]+\]|\([^)]*\))|([^\s\[\]()]+)/g;
        let match;

        while ((match = regex.exec(element.text)) !== null) {
            if (match[1]) {
                // This is anything in brackets - Not meant to be read out loud and matched
                parsed.push({
                    type: 'other',
                    content: match[1]
                });
            } else if (match[2]) {
                // This is regular text
                parsed.push({
                    type: 'text',
                    content: match[2]
                });
            }
        }

        return parsed;
    }, [element.text]);

    // Collect spans when becoming current (only word spans, not bracketed text)
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
                <p className={`text-base leading-relaxed px-[2px] py-[5px] ${isDarkMode ? 'text-primary-light' : 'text-primary-dark'
                    }`}>
                    {parseNonUserText.map((segment, i) => {
                        if (segment.type === 'other') {
                            // Strip outer [ ]
                            const inner = segment.content.slice(1, -1).trim();

                            if (inner.toLowerCase().startsWith("tag:")) {
                                const tagText = inner.slice(4).trim(); // remove "tag:"
                                return (
                                    <span
                                        key={`tag-${element.index}-${i}`}
                                        className="inline-block rounded-full bg-purple-600 text-white text-sm font-medium px-3 py-0.75 mx-1"
                                    >
                                        {tagText}
                                    </span>
                                );
                            } else {
                                // ✅ Normal bracketed text, render as plain span with brackets or parenthesis
                                return (
                                    <span key={`other-${i}`} className={`italic mx-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-400'
                                        }`}>
                                        {segment.content}
                                    </span>
                                );
                            }
                        } else {
                            // Render regular text
                            return (
                                <span key={`text-${i}`}>
                                    {segment.content + " "}
                                </span>
                            );
                        }
                    })}
                </p>
            </div>
        );
    }

    // User lines with word spans and audio tags
    const containerClasses = `pl-4 border-l-3 border-gray-300 ${isWaitingForUser && isCurrent ? WAITING : ''}`;

    return (
        <div className={containerClasses} ref={containerRef}>
            <div className="text-base leading-relaxed">
                {segments.map((segment, i) => {
                    if (segment.type === 'other') {
                        // Strip outer [ ]
                        const inner = segment.content.slice(1, -1).trim();

                        if (inner.toLowerCase().startsWith("tag:")) {
                            // ✅ Audio tag
                            const tagText = inner.slice(4).trim(); // remove "tag:"
                            return (
                                <span
                                    key={`tag-${element.index}-${i}`}
                                    className="inline-block rounded-full bg-purple-600 text-white text-sm font-medium px-3 py-0.75 mx-1"
                                >
                                    {tagText}
                                </span>
                            );
                        } else {
                            // ✅ Normal bracketed text, render as plain span with brackets or parenthesis
                            return (
                                <span key={`other-${i}`} className="text-gray-400 italic mx-1">
                                    {segment.content}
                                </span>
                            );
                        }
                    } else {
                        // Render words with potential highlighting
                        const isMatched = isCompleted ||
                            (isCurrent && segment.wordIndex! < matchedCount) ||
                            (!isCurrent && segment.wordIndex! < matchedCount);
                        const spanClasses = `${BASE} ${isMatched ? MATCHED : ''}`;

                        return (
                            <span
                                key={`word-${segment.wordIndex}`}
                                data-word-index={segment.wordIndex}
                                className={`${spanClasses}`}
                            >
                                {segment.content + " "}
                            </span>
                        );
                    }
                })}
            </div>
        </div>
    );
});

OptimizedLineRenderer.displayName = "OptimizedLineRenderer";