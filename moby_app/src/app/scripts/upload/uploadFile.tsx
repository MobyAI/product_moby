'use client'
import { Layout } from '@/components/ui';

interface UploadFormProps {
    onFileUpload: () => void;
}

const UploadForm = ({ onFileUpload }: UploadFormProps) => {

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl shadow-lg p-12 max-w-md w-full text-center">
                    {/* Play Logo */}
                    <div className="mb-8">
                        <div className="inline-flex items-center justify-center">
                            <span 
                                className="text-6xl font-bold tracking-tight"
                                style={{
                                    background: 'linear-gradient(45deg, #ff6b9d, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))'
                                }}
                            >
                                Play
                            </span>
                        </div>
                    </div>

                    {/* Question Text */}
                    <h1 className="text-2xl font-medium text-gray-700 mb-12 leading-relaxed">
                        What do you want to<br />
                        practice today?
                    </h1>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <button
                            onClick={onFileUpload}
                            className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-white font-semibold py-4 px-8 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            Upload Script
                        </button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default UploadForm;