import { useState } from 'react';
import type { ScriptElement } from '@/types/script';

type EditableLineProps = {
    item: ScriptElement;
    onUpdate: (updatedItem: ScriptElement) => void;
    onClose: () => void;
};

export default function EditableLine({ item, onUpdate, onClose }: EditableLineProps) {
    const [draftText, setDraftText] = useState(item.text);

    const handleSave = () => {
        onUpdate({ ...item, text: draftText });
        onClose();
    };

    return (
        <div className="mb-4 mx-8 lg:mx-16">
            <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-900 uppercase tracking-wide">{item.character}</span>
                    <span className="text-xs text-gray-500 italic px-2 py-1 bg-gray-100 rounded">{item.tone}</span>
                    <span className={`text-xs px-2 py-1 rounded border ${item.role === 'user'
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : 'bg-blue-100 border-blue-300 text-blue-800'
                        }`}>
                        {item.role === 'user' ? '🙋 You' : '🤖 Scene Partner'}
                    </span>
                </div>
                <textarea
                    className="w-full border rounded p-2 font-mono text-sm"
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    autoFocus
                />
                <button
                    className="mt-2 px-3 py-1 text-sm bg-yellow-400 text-white rounded"
                    onClick={handleSave}
                >
                    Update
                </button>
                <button
                    className="mt-2 px-3 py-1 text-sm bg-red-400 text-white rounded"
                    onClick={onClose}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}