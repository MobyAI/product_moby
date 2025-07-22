'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const Homepage = () => {
    const [currentWord, setCurrentWord] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
  
    const words = ['mom', 'girlfriend', 'roommate'];

    useEffect(() => {
        const interval = setInterval(() => {
        setCurrentWord((prev) => (prev + 1) % words.length);
        }, 2000);

        return () => clearInterval(interval);
    }, []);

    const router = useRouter();

    const handlePlay = () => {
        setIsPlaying(!isPlaying);
    };

    const startFn = () => {
        router.push('/upload')
      }

    return (
        <div className="min-h-screen bg-gray-50">
        {/* Navigation */}
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                <div className="text-lg font-semibold text-gray-900">MOBY</div>
                </div>
            </div>
            </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <div className="text-center mb-8">
            <div className="text-sm text-gray-500 mb-8">MOBY</div>
            </div>

            <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-8">
                Stop calling your{' '}
                <span className="relative inline-block w-60 text-left">
                <span 
                    key={currentWord}
                    className="text-blue-600 animate-fade-in"
                >
                    {words[currentWord]}
                </span>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600"></div>
                </span>
                <br />
                to be your reader
            </h1>

            <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
                No more scheduling conflicts. No more sister complaining that you're taking too long. No more excuses.
            </p>
            <button onClick={startFn} className="bg-blue-600 text-white px-6 py-2 rounded-full text-lg font-medium hover:bg-blue-700 transition-colors">
                Try it now
            </button>
            </div>
        </div>

        <style jsx>{`
            @keyframes fade-in {
            0% {
                opacity: 0;
                transform: translateY(10px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
            }
            
            .animate-fade-in {
            animation: fade-in 0.5s ease-in-out;
            }
        `}</style>
        </div>
    );
};

export default Homepage;