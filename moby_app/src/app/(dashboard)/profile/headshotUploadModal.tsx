import { useState } from "react";
import { X, Upload, Camera } from "lucide-react";
import { uploadHeadshot } from "@/lib/firebase/client/media";
import { auth } from "@/lib/firebase/client/config/app";

type HeadshotUploadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
};

export default function HeadshotUploadModal({ isOpen, onClose, onSuccess }: HeadshotUploadModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    async function handleFileUpload(file: File) {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await uploadHeadshot(file, auth.currentUser?.uid || '');
            if (result.success) {
                onSuccess();
                onClose();
            } else {
                setError(result.error || 'Upload failed');
            }
        } catch {
            setError('Failed to upload headshot');
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
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Camera className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-semibold">Upload New Headshot</h2>
                    <p className="text-gray-500 text-sm mt-1">Professional photo for your profile</p>
                </div>

                {/* Upload area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-48">
                        <div className="w-16 h-16 mx-auto mb-4 relative">
                            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                        <p className="text-gray-600">Processing your headshot...</p>
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
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-300 bg-transparent'
                            }`}>
                            <Upload className={`w-10 h-10 mb-3 ${isDragging ? 'text-purple-500' : 'text-gray-400'}`} />
                            <p className="mb-2 text-sm text-gray-600">
                                <span className="font-semibold">Click to upload or drag and drop</span>
                            </p>
                            <p className="text-xs text-gray-500">PNG, JPG up to 15MB</p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
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