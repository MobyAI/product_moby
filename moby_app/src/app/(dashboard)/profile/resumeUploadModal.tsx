import { useState } from "react";
import { X, Upload, FileText } from "lucide-react";
import { uploadResume } from "@/lib/firebase/client/media";
import { auth } from "@/lib/firebase/client/config/app";

type ResumeUploadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function ResumeUploadModal({ isOpen, onClose, onSuccess }: ResumeUploadModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    async function handleFileUpload(file: File) {
        const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

        if (!validTypes.includes(file.type)) {
            setError('Please upload a PDF or DOCX file');
            return;
        }

        if (file.size > 25 * 1024 * 1024) {
            setError('File size must be under 25MB');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await uploadResume(file, auth.currentUser?.uid || '');
            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError('Upload failed');
            }
        } catch {
            setError('Failed to upload resume');
        } finally {
            setLoading(false);
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-primary-light-alt rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1 rounded-lg hover:cursor-pointer"
                >
                    <X className="w-5 h-5 text-gray-500" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-semibold">Upload New Resume</h2>
                    <p className="text-gray-500 text-sm mt-1">PDF or DOCX format</p>
                </div>

                {/* Upload area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="w-16 h-16 mx-auto mb-4 relative">
                            <div className="absolute inset-0 border-4 border-emerald-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-600">Processing your resume...</p>
                    </div>
                ) : (
                    <label
                        className="block"
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleFileUpload(file);
                        }}
                    >
                        <div className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-all ${isDragging
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-300 bg-transparent'
                            }`}>
                            <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-emerald-500' : 'text-gray-400'}`} />
                            <p className="mb-2 text-sm text-gray-600">
                                <span className="font-semibold">Click to upload or drag and drop</span>
                            </p>
                            <p className="text-xs text-gray-500">PDF or DOCX up to 25MB</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(file);
                            }}
                        />
                    </label>
                )}

                {/* Error message */}
                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Footer buttons */}
                <div className="mt-6 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-2 bg-white/50 rounded-lg shadow-sm hover:cursor-pointer transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}