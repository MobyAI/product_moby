"use client";

import { useState, useEffect, ChangeEvent } from "react";
import {
  getAllVoiceSamples,
  updateVoiceSampleMetadata,
} from "@/lib/firebase/client/tts/index";

interface VoiceSample {
  name: string;
  description: string;
  url: string;
  voiceId: string;
  gender?: "male" | "female" | "non-binary";
  fileName: string;
}

interface EditingState {
  [fileName: string]: {
    voiceId: string;
    name: string;
    description: string;
    gender: "male" | "female" | "non-binary" | "";
  };
}

export default function VoiceSamplesManager(): React.ReactElement {
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingStates, setEditingStates] = useState<EditingState>({});
  const [savingStates, setSavingStates] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [statusMessages, setStatusMessages] = useState<{
    [key: string]: { type: "success" | "error"; message: string };
  }>({});

  useEffect(() => {
    loadVoiceSamples();
  }, []);

  const loadVoiceSamples = async (): Promise<void> => {
    setLoading(true);
    try {
      const fetchedSamples = await getAllVoiceSamples();
      setSamples(fetchedSamples);
    } catch (error) {
      console.error("Error loading voice samples:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (sample: VoiceSample): void => {
    setEditingStates((prev) => ({
      ...prev,
      [sample.fileName]: {
        voiceId: sample.voiceId,
        name: sample.name,
        description: sample.description,
        gender: sample.gender || "",
      },
    }));
  };

  const cancelEditing = (fileName: string): void => {
    setEditingStates((prev) => {
      const newState = { ...prev };
      delete newState[fileName];
      return newState;
    });
    setStatusMessages((prev) => {
      const newState = { ...prev };
      delete newState[fileName];
      return newState;
    });
  };

  const handleFieldChange = (
    fileName: string,
    field: keyof EditingState[string],
    value: string
  ): void => {
    setEditingStates((prev) => ({
      ...prev,
      [fileName]: {
        ...prev[fileName],
        [field]: value,
      },
    }));
  };

  const saveChanges = async (sample: VoiceSample): Promise<void> => {
    const editState = editingStates[sample.fileName];
    if (!editState) return;

    setSavingStates((prev) => ({ ...prev, [sample.fileName]: true }));
    setStatusMessages((prev) => {
      const newState = { ...prev };
      delete newState[sample.fileName];
      return newState;
    });

    try {
      await updateVoiceSampleMetadata(sample.fileName, {
        voiceId: editState.voiceId,
        name: editState.name,
        description: editState.description,
        gender: editState.gender || undefined,
      });

      setStatusMessages((prev) => ({
        ...prev,
        [sample.fileName]: {
          type: "success",
          message: "Successfully updated!",
        },
      }));

      // Refresh the samples list
      await loadVoiceSamples();

      // Clear editing state after a delay
      setTimeout(() => {
        cancelEditing(sample.fileName);
      }, 2000);
    } catch (error) {
      console.error("Error updating voice sample:", error);
      setStatusMessages((prev) => ({
        ...prev,
        [sample.fileName]: {
          type: "error",
          message: error instanceof Error ? error.message : "Failed to update",
        },
      }));
    } finally {
      setSavingStates((prev) => ({ ...prev, [sample.fileName]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading voice samples...</div>
      </div>
    );
  }

  if (samples.length === 0) {
    return (
      <div className="text-center p-12 text-gray-500">
        No voice samples found. Upload some to get started!
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-header-2 text-primary-dark mb-8">
        Manage Voice Samples
      </h1>

      <div className="space-y-6">
        {samples.map((sample) => {
          const isEditing = !!editingStates[sample.fileName];
          const editState = editingStates[sample.fileName];
          const isSaving = savingStates[sample.fileName];
          const statusMessage = statusMessages[sample.fileName];

          return (
            <div
              key={sample.fileName}
              className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm"
            >
              {!isEditing ? (
                // View Mode
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {sample.name}
                      </h3>
                      <p className="text-sm text-gray-500 mb-2">
                        ID: {sample.voiceId}
                      </p>
                      {sample.gender && (
                        <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mb-2">
                          {sample.gender}
                        </span>
                      )}
                      <p className="text-gray-700">{sample.description}</p>
                    </div>
                    <button
                      onClick={() => startEditing(sample)}
                      className="ml-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  <audio
                    controls
                    className="w-full"
                    src={sample.url}
                    preload="metadata"
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                // Edit Mode
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Voice ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editState.voiceId}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleFieldChange(
                            sample.fileName,
                            "voiceId",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Voice Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editState.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          handleFieldChange(
                            sample.fileName,
                            "name",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={editState.gender}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                        handleFieldChange(
                          sample.fileName,
                          "gender",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSaving}
                    >
                      <option value="">Select gender...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={editState.description}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                        handleFieldChange(
                          sample.fileName,
                          "description",
                          e.target.value
                        )
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={isSaving}
                    />
                  </div>

                  <audio
                    controls
                    className="w-full mb-4"
                    src={sample.url}
                    preload="metadata"
                  >
                    Your browser does not support the audio element.
                  </audio>

                  {statusMessage && (
                    <div
                      className={`p-3 rounded-md ${
                        statusMessage.type === "success"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {statusMessage.message}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => saveChanges(sample)}
                      disabled={isSaving}
                      className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => cancelEditing(sample.fileName)}
                      disabled={isSaving}
                      className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
