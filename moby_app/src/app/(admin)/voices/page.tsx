'use client';

import { useState, useRef, ChangeEvent, FormEvent } from 'react';
import { saveVoiceSampleBlob } from '@/lib/firebase/client/tts/index';

// Type definitions
interface VoiceMetadata {
    voiceId: string;
    voiceName: string;
    description: string;
}

interface UploadStatus {
    type: 'error' | 'success' | 'info' | '';
    message: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB in bytes
const ACCEPTED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp3'];

export default function VoiceUploadPage(): React.ReactElement {
    const [file, setFile] = useState<File | null>(null);
    const [metadata, setMetadata] = useState<VoiceMetadata>({
        voiceId: '',
        voiceName: '',
        description: ''
    });
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
        type: '',
        message: ''
    });
    const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const validateFile = (selectedFile: File): boolean => {
        // Validate file type
        if (!ACCEPTED_AUDIO_TYPES.includes(selectedFile.type)) {
            setUploadStatus({
                type: 'error',
                message: 'Please select an MP3 file'
            });
            return false;
        }

        // Validate file size
        if (selectedFile.size > MAX_FILE_SIZE) {
            setUploadStatus({
                type: 'error',
                message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            });
            return false;
        }

        return true;
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const selectedFile = e.target.files?.[0];

        if (selectedFile) {
            if (!validateFile(selectedFile)) {
                return;
            }

            setFile(selectedFile);
            setUploadStatus({ type: '', message: '' });

            // Clean up previous preview URL if it exists
            if (audioPreviewUrl) {
                URL.revokeObjectURL(audioPreviewUrl);
            }

            // Create new preview URL
            const url = URL.createObjectURL(selectedFile);
            setAudioPreviewUrl(url);
        }
    };

    const handleMetadataChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ): void => {
        const { name, value } = e.target;
        setMetadata(prev => ({
            ...prev,
            [name as keyof VoiceMetadata]: value
        }));
    };

    const validateForm = (): boolean => {
        if (!file) {
            setUploadStatus({
                type: 'error',
                message: 'Please select a file'
            });
            return false;
        }

        const requiredFields: (keyof VoiceMetadata)[] = ['voiceId', 'voiceName', 'description'];
        const emptyFields = requiredFields.filter(field => !metadata[field].trim());

        if (emptyFields.length > 0) {
            setUploadStatus({
                type: 'error',
                message: `Please fill in all metadata fields: ${emptyFields.join(', ')}`
            });
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsUploading(true);
        setUploadStatus({ type: 'info', message: 'Uploading...' });

        try {
            // TypeScript knows file is not null here due to validateForm
            await saveVoiceSampleBlob(
                metadata.voiceId,
                metadata.voiceName,
                file!,
                metadata.description
            );

            setUploadStatus({
                type: 'success',
                message: 'Voice sample uploaded successfully!'
            });

            // Reset form after successful upload
            resetForm();

        } catch (error) {
            console.error('Upload error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            setUploadStatus({
                type: 'error',
                message: `Upload failed: ${errorMessage}`
            });
        } finally {
            setIsUploading(false);
        }
    };

    const resetForm = (): void => {
        setFile(null);
        setMetadata({
            voiceId: '',
            voiceName: '',
            description: ''
        });
        setUploadStatus({ type: '', message: '' });

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        if (audioPreviewUrl) {
            URL.revokeObjectURL(audioPreviewUrl);
            setAudioPreviewUrl(null);
        }
    };

    const handleReset = (): void => {
        resetForm();
    };

    const formatFileSize = (bytes: number): string => {
        const kb = bytes / 1024;
        if (kb < 1024) {
            return `${kb.toFixed(2)} KB`;
        }
        return `${(kb / 1024).toFixed(2)} MB`;
    };

    const getStatusStyles = (type: UploadStatus['type']): string => {
        switch (type) {
            case 'error':
                return 'bg-red-50 text-red-700 border border-red-200';
            case 'success':
                return 'bg-green-50 text-green-700 border border-green-200';
            case 'info':
                return 'bg-blue-50 text-blue-700 border border-blue-200';
            default:
                return '';
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 overflow-y-auto">
            <h1 className="text-header-2 text-primary-dark mb-8">Upload Voice Sample</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* File Upload Section */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <label
                        htmlFor="file-upload"
                        className="block mb-2 text-sm font-medium text-gray-700"
                    >
                        MP3 File
                    </label>
                    <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_AUDIO_TYPES.join(',')}
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              cursor-pointer"
                        disabled={isUploading}
                        aria-describedby="file-upload-help"
                    />
                    <p id="file-upload-help" className="mt-1 text-xs text-gray-500">
                        MP3 files only, maximum {MAX_FILE_SIZE / (1024 * 1024)}MB
                    </p>

                    {file && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-md">
                            <p className="text-sm text-gray-600">
                                Selected: <span className="font-medium">{file.name}</span>
                            </p>
                            <p className="text-xs text-gray-500">
                                Size: {formatFileSize(file.size)}
                            </p>
                        </div>
                    )}

                    {/* Audio Preview */}
                    {audioPreviewUrl && (
                        <div className="mt-4">
                            <label
                                htmlFor="audio-preview"
                                className="block mb-2 text-sm font-medium text-gray-700"
                            >
                                Preview
                            </label>
                            <audio
                                id="audio-preview"
                                controls
                                className="w-full"
                                src={audioPreviewUrl}
                            >
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                </div>

                {/* Metadata Section */}
                <div className="space-y-4">
                    <div>
                        <label
                            htmlFor="voiceId"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            Voice ID <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="voiceId"
                            name="voiceId"
                            value={metadata.voiceId}
                            onChange={handleMetadataChange}
                            placeholder="e.g., voice_001"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isUploading}
                            aria-required="true"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="voiceName"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            Voice Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="voiceName"
                            name="voiceName"
                            value={metadata.voiceName}
                            onChange={handleMetadataChange}
                            placeholder="e.g., Professional Male Voice"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isUploading}
                            aria-required="true"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="description"
                            className="block mb-2 text-sm font-medium text-gray-700"
                        >
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={metadata.description}
                            onChange={handleMetadataChange}
                            placeholder="Describe the voice characteristics, tone, accent, etc."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isUploading}
                            aria-required="true"
                        />
                    </div>
                </div>

                {/* Status Messages */}
                {uploadStatus.message && (
                    <div
                        className={`p-4 rounded-md ${getStatusStyles(uploadStatus.type)}`}
                        role="alert"
                        aria-live="polite"
                    >
                        {uploadStatus.message}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={isUploading || !file}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        aria-busy={isUploading}
                    >
                        {isUploading ? 'Uploading...' : 'Upload Voice Sample'}
                    </button>

                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={isUploading}
                        className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Reset
                    </button>
                </div>
            </form>
        </div>
    );
}