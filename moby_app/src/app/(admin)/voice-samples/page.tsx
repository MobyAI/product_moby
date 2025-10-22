"use client";

import VoiceUploadPage from "./voiceUploadForm";
import VoiceSamplesManager from "./voiceSamplesManager";

export default function VoiceManagementPage(): React.ReactElement {
  return (
    <div className="min-h-screen bg-transparent">
      <div className="max-w-[1800px] mx-auto p-6">
        <h1 className="text-header-2 text-primary-dark mb-8">
          Voice Sample Management
        </h1>

        <div className="flex flex-col xl:flex-row gap-6">
          {/* Upload Form - Takes 40% width on large screens */}
          <div className="xl:w-2/5 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm sticky top-6">
              <VoiceUploadPage />
            </div>
          </div>

          {/* Voice Samples List - Takes 60% width on large screens */}
          <div className="xl:w-3/5 flex-1">
            <div className="bg-white rounded-lg shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
              <VoiceSamplesManager />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
