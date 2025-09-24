import { useState, useRef, useEffect } from 'react';
import type { ScriptElement } from '@/types/script';

type EditableDirectionProps = {
    item: ScriptElement;
    onUpdate: (updatedItem: ScriptElement) => Promise<void> | void;
    onClose: () => void;
};

export default function EditableDirection({
    item,
    onUpdate,
    onClose,
}: EditableDirectionProps) {
    const originalTextRef = useRef<string>(item.text.trim());
    const [draftText, setDraftText] = useState(originalTextRef.current);
    const [updating, setUpdating] = useState(false);

    const hasContentChanged = (current: string): boolean => {
        return current.trim() !== originalTextRef.current;
    };

    const handleSave = async () => {
        const normalized = draftText.replace(/\s+/g, ' ').trim();
        if (hasContentChanged(normalized)) {
            try {
                setUpdating(true);
                await onUpdate({ ...item, text: normalized });
            } finally {
                setUpdating(false);
            }
        } else {
            onClose();
        }
    };

    // Auto-focus and auto-resize when mounted
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // reset to shrink if needed
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [draftText]);

    return (
        <div className="pl-4 border-l-4 border-gray-300">
            <div className="text-base leading-relaxed">
                <textarea
                    ref={textareaRef}
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={onClose}
                    className="w-full border rounded p-2 text-base leading-relaxed text-gray-700 min-h-[4rem] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
                <div className="mt-2 flex items-center gap-3">
                    <button
                        className={`px-3 py-1 text-sm text-white rounded ${updating ? 'bg-yellow-400/60 cursor-not-allowed' : 'bg-yellow-400 hover:bg-yellow-500'}`}
                        onMouseDown={(e) => {
                            e.preventDefault(); // stop blur
                            handleSave();
                        }}
                        disabled={updating}
                    >
                        {updating ? 'Updating' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}