'use client';
import { Button } from '@/components/ui/Buttons';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';

const Homepage = () => {
  const [currentWord, setCurrentWord] = useState(0);
  const words = ['mom', 'girlfriend', 'roommate'];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWord((prev) => (prev + 1) % words.length);
    }, 2000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const router = useRouter();
  
  const startFn = () => {
    // router.push('/upload')
    router.push('/scripts/upload')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-lg font-semibold text-gray-900">PLAY</div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section - Centered */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="text-sm text-gray-500 mb-8">PLAY</div>
          
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-8">
            Stop calling your{' '}
            <span className="relative inline-block w-60 text-left">
              <span
                key={currentWord}
                className="text-blue-600 animate-fade-in relative after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-1 after:bg-blue-600"
              >
                {words[currentWord]}
              </span>
            </span>
            <br />
            to be your reader
          </h1>
          
          <p className="text-xl text-gray-600 mb-4 max-w-2xl mx-auto">
            No more scheduling conflicts. No more sister complaining that you&apos;re taking too long. No more excuses.
          </p>
          
          <Button onClick={startFn}>
            Try it now
          </Button>
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