'use client'

import { useState } from 'react';
import { Layout } from '@/components/ui/Layout';
import { Button } from '@/components/ui/Buttons';
import { useRouter } from 'next/navigation';
import { parseScriptFile } from '@/lib/api/parse';
import { Input } from '@/components/ui/Input';
import { ScriptElement } from '@/types/script';

export default function UploadPage({ onParsed } : { onParsed: (rawScript: ScriptElement[]) => void }) {

    const router = useRouter();

    const [file, setFile] = useState<File | null>(null);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || isLoading) return;

        setIsLoading(true);
        setMessage('');

        try {
            const parsedScript = await parseScriptFile(file);
            if (parsedScript) {
                setMessage('Script parsed successfully!');
                onParsed(parsedScript);
            } else {
                setMessage('Error: Failed to parse script.');
            }
        } catch (error) {
            setMessage('Error: Failed to parse script');
            console.log('what is the error', error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleCancel = () => {
        router.push('/home')
    }

    return (
        <Layout title="Upload New Script">
            <div className="min-h-screen flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-4xl">
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <form onSubmit={handleSubmit}>
                            {/* Upload Methods */}
                            <div className="grid md:grid-cols-1 gap-8 mb-8">
                                {/* File Upload */}
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold mb-4 text-black">Upload File</h3>
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                                        <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-4"></i>
                                        {/* <p className="text-gray-600 mb-4">Drag and drop your script file here</p> */}
                                        <p className="text-sm text-gray-500 mb-4">Supports PDF, DOCX</p>
                                        {/* <Button type="button">Choose File</Button> */}
                                        <Input 
                                            type="file"
                                            accept=".pdf, .docx"
                                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                                            disabled={isLoading}
                                            required
                                            label={'Choose file'}
                                            style={{ width: 500 }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-8 flex justify-center gap-4">
                                <Button variant="secondary" type="button" onClick={handleCancel}>Cancel</Button>
                                <Button 
                                    type="submit" 
                                    disabled={!file || isLoading }
                                    className={`px-4 py-2 rounded font-medium transition-colors ${!file || isLoading
                                        ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Parsing! This may take a moment.
                                        </span>
                                    ) : (
                                        'Upload and Parse'
                                    )}
                                </Button>
                            </div>
                            <div className="mt-4 justify-center">
                            {message && (
                                <p className={`text-sm ${message.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                                    {message}
                                </p>
                            )}
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    )
}   