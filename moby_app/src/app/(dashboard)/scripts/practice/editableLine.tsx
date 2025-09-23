import { useState, useEffect, useRef } from 'react';
import type { ScriptElement } from '@/types/script';

type EditableLineProps = {
    item: ScriptElement;
    onUpdate: (updatedItem: ScriptElement) => void;
    onClose: () => void;
    hydrationStatus?: 'pending' | 'updating' | 'ready' | 'failed';
};

export default function EditableLine({ item, onUpdate, onClose, hydrationStatus }: EditableLineProps) {
    const originalTextRef = useRef<string>('');
    const editableRef = useRef<HTMLDivElement>(null);
    const isComposing = useRef(false);
    const [draftText, setDraftText] = useState(() => {
        const trimmedText = item.text.trim();
        originalTextRef.current = trimmedText;
        return trimmedText;
    });

    // Check for updates before save
    const hasContentChanged = (currentText: string): boolean => {
        const current = currentText.trim();
        const original = originalTextRef.current;
        return current !== original;
    };

    // Apply styling to bracketed text
    const applyBracketStyling = (text: string): string => {
        return text.replace(
            /(\[tag:\s*[^\]]*\])/g,
            '<span class="text-purple-700">$1</span>'
        );
    };

    // Get cursor position in contentEditable
    const saveCursorPosition = () => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return null;

        const range = selection.getRangeAt(0);
        const preRange = range.cloneRange();
        preRange.selectNodeContents(editableRef.current!);
        preRange.setEnd(range.startContainer, range.startOffset);

        const start = preRange.toString().length;
        return start;
    };

    // Restore cursor position in contentEditable
    const restoreCursorPosition = (position: number) => {
        if (!editableRef.current) return;

        const selection = window.getSelection();
        const range = document.createRange();

        let charCount = 0;
        const nodeStack: Node[] = [editableRef.current];
        let foundStart = false;

        while (nodeStack.length > 0 && !foundStart) {
            const node = nodeStack.pop()!;

            if (node.nodeType === Node.TEXT_NODE) {
                const textLength = node.textContent?.length || 0;
                if (charCount + textLength >= position) {
                    range.setStart(node, position - charCount);
                    foundStart = true;
                } else {
                    charCount += textLength;
                }
            } else {
                // Add child nodes in reverse order to process them in order
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    nodeStack.push(node.childNodes[i]);
                }
            }
        }

        if (foundStart) {
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    };

    // Check if cursor is at the edge of an audio tag
    const checkAudioTagBoundary = (text: string, cursorPos: number) => {
        // Find all audio tags with "tag:" prefix
        const regex = /\[tag:\s*[^\]]*\]/g;
        let match;

        while ((match = regex.exec(text)) !== null) {
            const tagStart = match.index;
            const tagEnd = match.index + match[0].length;
            const immutableEnd = tagStart + 5; // "[tag: ".length = 5

            // Check if cursor is at the boundary of this tag
            if (cursorPos === tagEnd || cursorPos === tagStart) {
                return { tagStart, tagEnd, tagContent: match[0], immutableEnd };
            }

            // Check if cursor is inside the immutable part "[tag: "
            if (cursorPos > tagStart && cursorPos <= immutableEnd) {
                return { tagStart, tagEnd, tagContent: match[0], immutableEnd };
            }

            // Check if cursor is anywhere else inside the tag
            if (cursorPos > immutableEnd && cursorPos < tagEnd) {
                return { tagStart, tagEnd, tagContent: match[0], immutableEnd };
            }
        }

        return null;
    };

    // Select an entire audio tag
    const selectAudioTag = (tagStart: number, tagEnd: number) => {
        if (!editableRef.current) return;

        const selection = window.getSelection();
        const range = document.createRange();

        let charCount = 0;
        let startNode: Node | null = null;
        let endNode: Node | null = null;
        let startOffset = 0;
        let endOffset = 0;

        const findNodes = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const textLength = node.textContent?.length || 0;

                if (!startNode && charCount + textLength > tagStart) {
                    startNode = node;
                    startOffset = tagStart - charCount;
                }

                if (!endNode && charCount + textLength >= tagEnd) {
                    endNode = node;
                    endOffset = tagEnd - charCount;
                }

                charCount += textLength;
            } else {
                for (let i = 0; i < node.childNodes.length; i++) {
                    findNodes(node.childNodes[i]);
                    if (startNode && endNode) break;
                }
            }
        };

        findNodes(editableRef.current);

        if (startNode && endNode) {
            range.setStart(startNode, startOffset);
            range.setEnd(endNode, endOffset);
            selection?.removeAllRanges();
            selection?.addRange(range);
            return true;
        }

        return false;
    };

    // Set initial text with styling
    useEffect(() => {
        if (editableRef.current && editableRef.current.innerHTML !== applyBracketStyling(item.text)) {
            editableRef.current.innerHTML = applyBracketStyling(item.text);
        }
    }, [item.text]);

    // Auto-focus on mount
    useEffect(() => {
        if (editableRef.current) {
            editableRef.current.focus();
            // Place cursor at end of text
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(editableRef.current);
            range.collapse(false);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }
    }, []);

    // Auto-resize based on content
    useEffect(() => {
        if (editableRef.current) {
            editableRef.current.style.height = 'auto';
            editableRef.current.style.height = `${editableRef.current.scrollHeight}px`;
        }
    }, [draftText]);

    // Handle keyboard input for auto-closing brackets
    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Handle backspace and delete for smart audio tag deletion
        if ((e.key === 'Backspace' || e.key === 'Delete') && !isComposing.current) {
            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);

            if (range && editableRef.current) {
                const text = editableRef.current.innerText || '';
                const cursorPos = saveCursorPosition();

                if (cursorPos !== null) {
                    // Check if we're about to delete any part of an audio tag structure
                    let aboutToDeleteImmutable = false;
                    let charToDelete = '';

                    if (e.key === 'Backspace' && cursorPos > 0) {
                        charToDelete = text[cursorPos - 1];
                        // Check if character before cursor is part of immutable structure
                        aboutToDeleteImmutable = charToDelete === '[' || charToDelete === ']' ||
                            charToDelete === 't' || charToDelete === 'a' ||
                            charToDelete === 'g' || charToDelete === ':';
                    } else if (e.key === 'Delete' && cursorPos < text.length) {
                        charToDelete = text[cursorPos];
                        // Check if character at cursor is part of immutable structure
                        aboutToDeleteImmutable = charToDelete === '[' || charToDelete === ']' ||
                            charToDelete === 't' || charToDelete === 'a' ||
                            charToDelete === 'g' || charToDelete === ':';
                    }

                    if (aboutToDeleteImmutable) {
                        // Find the audio tag that contains this character
                        const tagInfo = checkAudioTagBoundary(text, cursorPos);

                        if (tagInfo) {
                            // Additional check: make sure we're actually trying to delete immutable parts
                            let isImmutableDeletion = false;

                            if (e.key === 'Backspace') {
                                // Check if we're trying to delete opening bracket, "tag", colon, or space after colon
                                if (cursorPos <= tagInfo.immutableEnd) {
                                    isImmutableDeletion = true;
                                }
                                // Also protect closing bracket
                                if (cursorPos === tagInfo.tagEnd && text[cursorPos - 1] === ']') {
                                    isImmutableDeletion = true;
                                }
                            } else if (e.key === 'Delete') {
                                // Check if we're trying to delete any part of "[tag: " or closing bracket
                                if (cursorPos < tagInfo.immutableEnd ||
                                    (cursorPos === tagInfo.tagEnd - 1 && text[cursorPos] === ']')) {
                                    isImmutableDeletion = true;
                                }
                            }

                            if (isImmutableDeletion) {
                                // Check if tag is already selected
                                const currentSelection = selection?.toString();
                                if (currentSelection === tagInfo.tagContent) {
                                    // Tag is already selected, delete it
                                    e.preventDefault();
                                    range.deleteContents();
                                    handleInput();
                                    return;
                                }

                                // Otherwise, select the entire audio tag
                                e.preventDefault();
                                if (selectAudioTag(tagInfo.tagStart, tagInfo.tagEnd)) {
                                    // The tag is now selected, user needs to press delete again
                                    return;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Trigger on [ or ]
        const isAudioTagTrigger =
            e.key === '[' ||
            e.key === ']';

        if (isAudioTagTrigger && !isComposing.current) {
            e.preventDefault();

            const selection = window.getSelection();
            const range = selection?.getRangeAt(0);

            if (range) {
                // Store if there's selected text
                const hasSelection = !range.collapsed;

                if (hasSelection) {
                    // Move to start of selection without deleting
                    range.collapse(true); // true = collapse to start
                }

                // Get the text content and cursor position context
                const container = range.commonAncestorContainer;
                const textContent = container.textContent || '';
                const offset = range.startOffset;

                // Check characters before and after cursor
                const charBefore = offset > 0 ? textContent[offset - 1] : '';
                const charAfter = offset < textContent.length ? textContent[offset] : '';

                // Determine if we need spaces
                const needSpaceBefore = offset > 0 && charBefore && charBefore !== ' ' && charBefore !== '\n';
                const needSpaceAfter = charAfter && charAfter !== ' ' && charAfter !== '\n';

                // Create text nodes
                const fragments = [];

                if (needSpaceBefore) {
                    fragments.push(document.createTextNode(' '));
                }

                const openBracket = document.createTextNode('[');
                const tagPrefix = document.createTextNode('tag: ');
                const closeBracket = document.createTextNode(']');

                fragments.push(openBracket, tagPrefix, closeBracket);

                if (needSpaceAfter) {
                    fragments.push(document.createTextNode(' '));
                }

                // Insert all fragments
                fragments.forEach(node => {
                    range.insertNode(node);
                    range.setStartAfter(node);
                });

                // Position cursor after "tag: " and before the closing bracket
                range.setStartAfter(tagPrefix);
                range.setEndBefore(closeBracket);
                selection?.removeAllRanges();
                selection?.addRange(range);

                // Trigger input handler to update state and apply styling
                handleInput();
            }
        }
    };

    // Handle input changes
    const handleInput = () => {
        if (editableRef.current) {
            const text = editableRef.current.innerText || '';
            setDraftText(text);

            // Save cursor position
            const cursorPos = saveCursorPosition();

            // Apply styling
            editableRef.current.innerHTML = applyBracketStyling(text);

            // Restore cursor position
            if (cursorPos !== null) {
                restoreCursorPosition(cursorPos);
            }
        }
    };

    // Add this function to normalize audio tag spacing
    const normalizeAudioTagSpacing = (text: string): string => {
        return text
            // First normalize spacing inside tags
            .replace(/\[tag:\s*(.*?)\]/g, (match, content) => {
                const trimmedContent = content.trim();
                return trimmedContent ? `[tag: ${trimmedContent}]` : '';
            })
            // Collapse extra spaces left behind if tag was removed
            .replace(/\s{2,}/g, ' ')
            .trim();
    };

    const handleSave = () => {
        if (editableRef.current) {
            const currentText = editableRef.current.innerText || '';
            const normalizedText = normalizeAudioTagSpacing(currentText);

            // Only save if content has actually changed
            if (hasContentChanged(normalizedText)) {
                onUpdate({ ...item, text: normalizedText });
            } else {
                // Just close without saving since nothing changed
                onClose();
            }
        } else {
            const normalizedText = normalizeAudioTagSpacing(draftText);
            if (hasContentChanged(normalizedText)) {
                onUpdate({ ...item, text: normalizedText });
            } else {
                onClose();
            }
        }
    };

    // Handle paste to ensure plain text
    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');

        const selection = window.getSelection();
        const range = selection?.getRangeAt(0);

        if (range) {
            range.deleteContents();
            const textNode = document.createTextNode(text);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(range);
        }

        handleInput();
    };

    return (
        <div className="pl-4 border-l-4 border-gray-300">
            <div className="text-base leading-relaxed">
                <div
                    ref={editableRef}
                    contentEditable
                    className="cursor-text w-full border rounded p-2 text-base leading-relaxed text-gray-700 min-h-[2.5rem] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={onClose}
                    onCompositionStart={() => isComposing.current = true}
                    onCompositionEnd={() => isComposing.current = false}
                    suppressContentEditableWarning={true}
                    style={{
                        minHeight: '2.5rem',
                        overflowY: 'hidden',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                    }}
                />
                <div className="mt-2 flex items-center gap-3">
                    <button
                        className="px-3 py-1 text-sm bg-yellow-400 text-white rounded"
                        onMouseDown={handleSave}
                        disabled={hydrationStatus === 'updating'}
                    >
                        {hydrationStatus === 'updating' ? 'Updating...' : 'Save'}
                    </button>

                    {/* Audio tag tip */}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <div className="relative group inline-flex">
                            <svg
                                className="w-5 h-5 text-gray-400 cursor-help"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>

                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-64 z-10">
                                <div className="space-y-1">
                                    <p>{"• Use for emotions, sounds, or pauses"}</p>
                                    <p>{"• Examples: [sigh], [pause], [chuckle], [excited], [angry], [whisper]"}</p>
                                    <p>{"• Keep it simple: 1 word preferred, 2 max"}</p>
                                </div>
                                {/* Tooltip arrow */}
                                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px]">
                                    <div className="border-4 border-transparent border-t-gray-800"></div>
                                </div>
                            </div>
                        </div>
                        <span>{`Insert audio tags by pressing opening or closing bracket.`}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}