import { useEffect, useState } from 'react';

interface LoadingScreenProps {
    header: string;
    message?: string;
    mode?: 'light' | 'dark';
}

export function LoadingScreen({ header, message, mode = 'dark' }: LoadingScreenProps) {
    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? "" : prev + ".");
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Define color classes based on mode
    const colors = {
        border: mode === 'dark' ? 'border-white' : 'border-gray-800',
        borderLight: mode === 'dark' ? 'border-white/20' : 'border-gray-800/20',
        borderMedium: mode === 'dark' ? 'border-white/40' : 'border-gray-800/40',
        text: mode === 'dark' ? 'text-white' : 'text-gray-700',
        textLight: mode === 'dark' ? 'text-white/90' : 'text-gray-700/90',
        textMedium: mode === 'dark' ? 'text-white/80' : 'text-gray-600',
    };

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
                {/* Animated Logo/Icon */}
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        <div className={`absolute inset-0 border-4 ${colors.borderLight} rounded-full`}></div>
                        <div className={`absolute inset-0 border-4 ${colors.border} border-t-transparent rounded-full animate-spin`}></div>
                        <div className={`absolute inset-2 border-2 ${colors.borderMedium} border-b-transparent rounded-full animate-spin animate-reverse`} style={{ animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                        </div>
                    </div>
                </div>

                {/* Loading Text */}
                <div className={colors.text}>
                    <span className={`text-header-3 ${colors.textLight}`}>{header}</span>
                    {message && <p className={`text-md ${colors.textMedium}`}>
                        {message}{dots}
                    </p>}
                </div>
            </div>
        </div>
    );
};