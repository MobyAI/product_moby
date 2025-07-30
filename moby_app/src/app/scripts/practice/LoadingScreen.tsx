import { useEffect, useState } from 'react';

const LoadingScreen = ({ loadStage, children }: { loadStage: boolean | null, children: React.ReactNode }) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center">
      <div className="text-center">
        {/* Animated Logo/Icon */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-2 border-white/40 border-b-transparent rounded-full animate-spin animate-reverse" style={{ animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Play Room
          </h1>
          <p className="text-xl text-white/80 mb-8">
            Preparing your scene{dots}
          </p>

          {/* Loading Stages */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
            <div className="text-left space-y-3">
              <div className="flex items-center gap-3">
                {/* <div className="w-2 h-2 bg-green-400 rounded-full"></div> */}
                {/* <span className="text-white/90">Initializing script loader</span> */}
                <span className="text-white/90">{children}</span>
              </div>
              <div className="flex items-center gap-3">
                {/* <div className={`w-2 h-2 rounded-full ${loadStage?.includes('Loading script') ? 'bg-yellow-400 animate-pulse' : loadStage?.includes('✅') ? 'bg-green-400' : 'bg-white/30'}`}></div>
                <span className="text-white/90">Loading script content</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${loadStage?.includes('embeddings') ? 'bg-yellow-400 animate-pulse' : loadStage?.includes('✅') ? 'bg-green-400' : 'bg-white/30'}`}></div>
                <span className="text-white/90">Processing embeddings</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${loadStage?.includes('TTS') ? 'bg-yellow-400 animate-pulse' : loadStage?.includes('✅') ? 'bg-green-400' : 'bg-white/30'}`}></div>
                <span className="text-white/90">Loading audio files</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${loadStage?.includes('Ready') ? 'bg-green-400' : 'bg-white/30'}`}></div>
                <span className="text-white/90">Finalizing setup</span> */}
              </div>
            </div>

            {/* Current Stage Display */}
            {loadStage && (
              <div className="mt-6 pt-4 border-t border-white/20">
                <p className="text-sm text-white/70 font-mono">
                  {loadStage}
                </p>
              </div>
            )}
          </div>

          {/* Fun Loading Messages */}
          <div className="mt-8 text-white/60 text-sm">
            <p>💡 Tip: Make sure you're in a quiet environment for the best speech recognition</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;