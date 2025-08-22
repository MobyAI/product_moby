'use client'

import { useState } from 'react';
import { Layout } from '@/components/ui';
import { parseScriptFile } from '@/lib/api/parse';
import { ScriptElement } from '@/types/script';
import LoadingScreen from '../practice/LoadingScreen';

export default function UploadPage({ onParsed } : { onParsed: (rawScript: ScriptElement[]) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStage, setLoadingStage] = useState('');

    const handleUploadScript = () => {
        // Create a hidden file input and trigger it
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.docx';
        input.onchange = handleFileUpload;
        input.click();
    };

    const handleFileUpload = async (event: Event) => {
        const target = event.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) return;

        setIsLoading(true);
        setLoadingProgress(0);
        
        try {
            // Stage 1: File reading
            setLoadingStage('Reading file...');
            setLoadingProgress(20);
            
            // Simulate file reading delay
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Stage 2: Processing document
            setLoadingStage('Processing document...');
            setLoadingProgress(40);
            
            // Stage 3: Parsing script format
            setLoadingStage('Parsing script format...');
            setLoadingProgress(60);
            
            // Stage 4: API call
            setLoadingStage('Analyzing characters...');
            setLoadingProgress(80);
            
            const parsedScript = await parseScriptFile(file);
            
            // Stage 5: Finalizing
            setLoadingStage('Finalizing...');
            setLoadingProgress(100);
            
            // Brief delay to show completion
            await new Promise(resolve => setTimeout(resolve, 300));
            
            if (parsedScript) {
                onParsed(parsedScript);
            } else {
                alert('Error: Failed to parse script.');
            }
        } catch (error) {
            alert('Error: Failed to parse script');
            console.error('Parse error:', error);
        } finally {
            setIsLoading(false);
            setLoadingProgress(0);
            setLoadingStage('');
        }
    };

    // Show loading screen when processing
    if (isLoading) {
        return (
            <Layout>
                <LoadingScreen loadStage={isLoading}>
                    {loadingStage}
                </LoadingScreen>
            </Layout>
        );
    }

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
                            onClick={handleUploadScript}
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