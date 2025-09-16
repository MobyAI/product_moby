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
const AUDIO_TAG = "audio-tag";

interface ParsedSegment {
    type: 'word' | 'audio-tag';
    content: string;
    wordIndex?: number; // Only for words, not audio tags
}

export const OptimizedLineRenderer = React.memo<OptimizedLineRendererProps>(({
    element,
    isCurrent,
    isWaitingForUser,
    spanRefMap,
    matchedCount,
    isCompleted
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    // Parse text to separate words and audio tags
    const segments = React.useMemo(() => {
        const parsed: ParsedSegment[] = [];
        const regex = /(\[[^\]]+\])|([^\s\[\]]+)/g;
        let match;
        let wordIndex = 0;

        while ((match = regex.exec(element.text)) !== null) {
            if (match[1]) {
                // This is an audio tag [something]
                parsed.push({
                    type: 'audio-tag',
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
        const parsed: { type: 'text' | 'audio-tag'; content: string }[] = [];
        const regex = /(\[[^\]]+\])|([^[\]]+)/g;
        let match;

        while ((match = regex.exec(element.text)) !== null) {
            if (match[1]) {
                // This is an audio tag [something]
                parsed.push({
                    type: 'audio-tag',
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

    // Collect spans when becoming current (only word spans, not audio tags)
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
                    {parseNonUserText.map((segment, i) => {
                        if (segment.type === 'audio-tag') {
                            // Render audio tags as buttons
                            const buttonText = segment.content.slice(1, -1);
                            return (
                                <button
                                    key={`btn-${element.index}-${i}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                    }}
                                    className="inline-flex items-center px-2 py-0 mx-0 rounded-sm"
                                    style={{
                                        background: '#b8b3d7',
                                        color: '#333333',
                                        fontWeight: '500'
                                    }}
                                >
                                    <span className={AUDIO_TAG}>
                                        {buttonText}
                                    </span>
                                </button>
                            );
                        } else {
                            // Render regular text
                            return (
                                <span key={`text-${i}`}>
                                    {segment.content}
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
                    if (segment.type === 'audio-tag') {
                        // Render audio tags without highlighting and without brackets
                        const buttonText = segment.content.slice(1, -1);
                        return (
                            <button
                                key={`btn-${element.index}-${i}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                }}
                                className="inline-flex items-center px-2.5 py-0.5 mx-1 rounded-sm"
                                style={{
                                    background: '#b8b3d7',
                                    color: '#333333',
                                    fontWeight: '500'
                                }}
                            >
                                <span className={AUDIO_TAG}>
                                    {buttonText}
                                </span>
                            </button>
                        );
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
                                className={spanClasses}
                            >
                                {segment.content + ' '}
                            </span>
                        );
                    }
                })}
            </div>
        </div>
    );
});

OptimizedLineRenderer.displayName = "OptimizedLineRenderer";