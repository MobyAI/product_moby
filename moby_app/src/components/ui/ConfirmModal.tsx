import React from "react";
import { Loader2 } from "lucide-react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    isProcessing,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl z-10">
                <h3 className="text-lg font-semibold mb-3">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isProcessing}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className={`flex-1 px-4 py-2 text-white rounded-lg transition flex items-center justify-center gap-2 ${isProcessing
                                ? 'bg-red-600/50 cursor-not-allowed'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                    >
                        {isProcessing && (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};