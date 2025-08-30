import { useState, useEffect, useRef } from 'react';
import type { ScriptElement } from '@/types/script';

type EditableLineProps = {
    item: ScriptElement;
    onUpdate: (updatedItem: ScriptElement) => void;
    onClose: () => void;
    hydrationStatus?: 'pending' | 'updating' | 'ready' | 'failed';
};

export default function EditableLine({ item, onUpdate, onClose, hydrationStatus }: EditableLineProps) {
    const [draftText, setDraftText] = useState(item.text);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [draftText]);

    const handleSave = () => {
        onUpdate({ ...item, text: draftText });
    };

    return (
        <div className="pl-4 border-l-3 border-gray-300">
            <div className="text-base leading-relaxed">
                <textarea
                    ref={textareaRef}
                    className="w-full border rounded p-2 text-base leading-relaxed text-gray-700"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    onBlur={onClose}
                    autoFocus
                />
                <button
                    className="mt-2 mr-2 px-3 py-1 text-sm bg-yellow-400 text-white rounded"
                    onMouseDown={handleSave}
                    disabled={hydrationStatus === 'updating'}
                >
                    {hydrationStatus === 'updating' ? 'Updating...' : 'Save'}
                </button>
            </div>
        </div>
    );
}