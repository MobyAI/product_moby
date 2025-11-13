import React, { useState, useEffect, useRef } from "react";
import { addScript } from "@/lib/firebase/client/scripts";
import { auth } from "@/lib/firebase/client/config/app";
import { onAuthStateChanged } from "firebase/auth";
import { extractScriptText } from "@/lib/api/parse/extract";
import { extractRolesFromText } from "@/lib/api/parse/roles";
import { parseScriptFromText } from "@/lib/api/parse/parse";
import { extractTextFromPDFimg } from "@/lib/extract/image";
import { isApprovedTag } from "@/lib/helpers/sanitizerTTS";
import { ScriptElement } from "@/types/script";
import { getAllVoiceSamples } from "@/lib/firebase/client/tts";
import Dialog, { useDialog } from "@/components/ui/Dialog";
import * as Sentry from "@sentry/nextjs";
import { useToast } from "@/components/providers/ToastProvider";
import { X, Play, Pause, Mars, Venus, NonBinary } from "lucide-react";

interface ScriptUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  onComplete: () => void;
}

interface ExtractedTextResult {
  text: string;
}

interface VoiceSample {
  name: string;
  description: string;
  url: string;
  voiceId: string;
  gender?: string;
}

interface VoiceAssignment {
  voiceId: string;
  voiceName: string;
}

interface RoleVoiceAssignmentProps {
  role: string;
  voiceSamples: VoiceSample[] | null;
  onAssign: (assignment: VoiceAssignment) => void;
  isLoading?: boolean;
}

interface ScriptRendererProps {
  script: ScriptElement[] | null;
  onScriptUpdate?: (updatedScript: ScriptElement[]) => void;
  editable?: boolean;
  onClose: () => void;
}

interface EditableLineProps {
  item: ScriptElement;
  onUpdate: (updatedItem: ScriptElement) => void;
  onClose: () => void;
}

type ProcessingErrorStage =
  | "voice"
  | "text"
  | "character"
  | "parse"
  | "general"
  | null;

interface ProcessingError {
  hasError: boolean;
  stage: ProcessingErrorStage;
  message: string;
}

interface ProcessingErrorProps {
  error: ProcessingError;
  onClose: () => void;
}

// Helper functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isLine(el: any): el is {
  type: "line";
  text: string;
  lineEndKeywords?: string[];
  character?: string;
} {
  return el && el.type === "line" && typeof el.text === "string";
}

const COMMON_WORDS = new Set([
  "the",
  "a",
  "an",
  "to",
  "and",
  "but",
  "or",
  "for",
  "at",
  "by",
  "in",
  "on",
  "of",
  "then",
  "so",
]);

function extractLineEndKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/gi, "")
    .split(/\s+/)
    .filter(Boolean);

  // Count occurrences of each word
  const counts = words.reduce<Record<string, number>>((acc, w) => {
    acc[w] = (acc[w] || 0) + 1;
    return acc;
  }, {});

  // Filter out common words and any word that occurs more than once
  const meaningful = words.filter((word) => {
    return !COMMON_WORDS.has(word) && counts[word] === 1;
  });

  const selected = meaningful.slice(-2);

  if (selected.length === 2) return selected;

  if (selected.length === 1) {
    const keyword = selected[0];
    const idx = words.lastIndexOf(keyword);
    let neighbor = "";

    // Prefer word before
    if (idx > 0) {
      neighbor = words[idx - 1];
    } else {
      neighbor = words[idx + 1];
    }

    return neighbor ? [neighbor, keyword] : [keyword];
  }

  if (selected.length === 0 && words.length > 0) {
    return words.slice(-2);
  }

  return [];
}

export default function ScriptUploadModal({
  isOpen,
  onClose,
  file,
  onComplete,
}: ScriptUploadModalProps) {
  // Core State
  const [currentStage, setCurrentStage] = useState(1);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [extractedText, setExtractedText] =
    useState<ExtractedTextResult | null>(null);
  const [processingError, setProcessingError] = useState<ProcessingError>({
    hasError: false,
    stage: null,
    message: "",
  });
  const [extractedRoles, setExtractedRoles] = useState<string[] | null>([]);
  const [parsedScript, setParsedScript] = useState<ScriptElement[] | null>(
    null
  );
  const [scriptSaving, setScriptSaving] = useState(false);
  const [scriptSaveError, setScriptSaveError] = useState(false);

  // User Inputs State
  const [scriptName, setScriptName] = useState("");
  const [roleAssignments, setRoleAssignments] = useState<
    Record<string, "user" | "scene-partner">
  >({});
  const [userRole, setUserRole] = useState("");
  const [missingCharacters, setMissingCharacters] = useState<string[]>([]);

  // Voice library state
  const [voiceSamples, setVoiceSamples] = useState<VoiceSample[] | null>(null);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [voiceLoadError, setVoiceLoadError] = useState(false);
  const [voiceAssignments, setVoiceAssignments] = useState<
    Record<string, VoiceAssignment>
  >({});
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    role: string;
    assignment: VoiceAssignment;
  } | null>(null);

  // Processing State
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [processingStage, setProcessingStage] = useState<{
    message: string;
    isComplete: boolean;
  }>({ message: "", isComplete: false });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isParsingInBackground, setIsParsingInBackground] = useState(false);

  // Animation State
  const [isTransitioning, setIsTransitioning] = useState(false);
  const modalRef = useRef(null);

  // Use a ref to track if processing should continue
  const shouldContinueProcessing = useRef(true);

  // Dialog component
  const { dialogProps, openConfirm } = useDialog();

  // Toast message
  const { showToast } = useToast();

  // Reset function
  const resetModal = () => {
    setCurrentStage(0);
    setExtractedText(null);
    setExtractedRoles([]);
    setParsedScript(null);
    setScriptName("");
    setRoleAssignments({});
    setVoiceAssignments({});
    setUserRole("");
    setProcessingStage({ message: "", isComplete: false });
    setIsParsingInBackground(false);
    setIsTransitioning(false);
    setProcessingError({
      hasError: false,
      stage: null,
      message: "",
    });
    setVoiceLoadError(false);
    setVoicesLoading(false);
    shouldContinueProcessing.current = true;
  };

  // Cancel processing
  const cancelProcessing = () => {
    shouldContinueProcessing.current = false;

    setProcessingStage({ message: "Processing cancelled", isComplete: false });
  };

  // Update handleClose to show confirmation
  const handleClose = () => {
    openConfirm(
      "Close",
      "Are you sure you want to close? Upload will be cancelled.",
      async () => {
        confirmClose();
      },
      { type: "confirm" }
    );
  };

  const confirmClose = () => {
    cancelProcessing();
    resetModal();
    onClose();
  };

  // Listen for page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      shouldContinueProcessing.current = false;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup on unmount
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      shouldContinueProcessing.current = false;
    };
  }, []);

  // Separate the voice loading function
  const loadVoiceSamples = async () => {
    setVoicesLoading(true);
    setVoiceLoadError(false);

    try {
      const data = await getAllVoiceSamples();

      // Check if data is valid
      if (!data || data.length === 0) {
        throw new Error("No voice samples available");
      }

      setVoiceSamples(data);
    } catch (err) {
      console.error("Failed to load voice samples:", err);
      Sentry.captureException(err);

      // Set error state
      setVoiceLoadError(true);
      setProcessingError({
        hasError: true,
        stage: "voice",
        message: "Unable to load.",
      });

      setCurrentStage(0);
    } finally {
      setVoicesLoading(false);
    }
  };

  // Update the useEffect to prevent processing if voices fail
  useEffect(() => {
    if (!isOpen) return;

    // Load voices (checking auth)
    const loadVoicesAndProcess = async () => {
      if (!voiceSamples && !voicesLoading && !voiceLoadError) {
        if (auth.currentUser) {
          // User already authenticated
          await loadVoiceSamples();
        } else {
          // Set up listener in case auth is still initializing
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
              await loadVoiceSamples();
              unsubscribe(); // Unsubscribe after loading
            }
          });
          return () => unsubscribe();
        }
      }

      // Only start file processing if file exists AND voices loaded successfully
      if (file && voiceSamples && !voiceLoadError) {
        startProcessing();
      }
    };

    loadVoicesAndProcess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file, voiceSamples, voiceLoadError]);

  const startProcessing = async () => {
    if (!file) return;

    // Start processing
    shouldContinueProcessing.current = true;

    try {
      // Stage 1: Extract Text
      setProcessingStage({
        message: "Extracting text from document...",
        isComplete: false,
      });
      setCurrentStage(1);
      let textResult;

      try {
        // Check if we should continue
        if (!shouldContinueProcessing.current) {
          console.log("Processing cancelled");
          return;
        }

        textResult = await extractScriptText(file, showToast);

        if (!shouldContinueProcessing.current) {
          console.log("Processing cancelled");
          return;
        }

        // Check if text extraction was successful and has enough unique words
        const minUniqueWords = 50;
        let uniqueWordCount = 0;

        if (textResult && textResult.text) {
          // Count unique words (basic word extraction)
          const words =
            textResult.text.toLowerCase().match(/\b[a-z]+\b/g) || [];
          const uniqueWords = new Set(words);
          uniqueWordCount = uniqueWords.size;
        }

        if (
          uniqueWordCount < minUniqueWords &&
          (file.type === "application/pdf" || file.name.endsWith(".pdf"))
        ) {
          setProcessingStage({
            message: "Image detected! This may take a little longer...",
            isComplete: false,
          });

          if (!shouldContinueProcessing.current) {
            console.log("Processing cancelled");
            return;
          }

          // Use the PDF extraction with GPT Vision
          const extractedText = await extractTextFromPDFimg(file);

          if (!shouldContinueProcessing.current) {
            console.log("Processing cancelled");
            return;
          }

          textResult = {
            text: extractedText.text,
          };

          // Only set characters if it's a valid array with items
          if (
            Array.isArray(extractedText.characters) &&
            extractedText.characters.length > 0
          ) {
            setExtractedRoles(extractedText.characters);
          }
        }

        if (
          !textResult ||
          !textResult.text ||
          textResult.text.trim().length === 0
        ) {
          // Set error state for empty text
          setProcessingError({
            hasError: true,
            stage: "text",
            message: "Failed to extract text",
          });
          setProcessingStage({
            message: "Failed to extract text from document",
            isComplete: false,
          });
          // Stop processing here
          return;
        }

        setExtractedText(textResult);
      } catch (error) {
        console.error("Text extraction failed:", error);
        Sentry.captureException(error);

        // Set error state for API failure
        setProcessingError({
          hasError: true,
          stage: "text",
          message: "Failed to extract text",
        });
        setProcessingStage({
          message: "Failed to extract text from document",
          isComplete: false,
        });

        // Stop processing here
        return;
      }

      // Stage 2: Extract Roles (automatic)
      setProcessingStage({
        message: "Identifying characters...",
        isComplete: false,
      });
      let rolesResult;

      if (!extractedRoles || extractedRoles.length === 0) {
        try {
          if (!shouldContinueProcessing.current) {
            console.log("Processing cancelled");
            return;
          }

          rolesResult = await extractRolesFromText(textResult.text, showToast);

          if (!shouldContinueProcessing.current) {
            console.log("Processing cancelled");
            return;
          }

          if (!rolesResult || rolesResult.length === 0) {
            setProcessingError({
              hasError: true,
              stage: "character",
              message: "Failed to identify characters",
            });
            setProcessingStage({
              message: "Failed to identify characters",
              isComplete: false,
            });
            return;
          }

          setExtractedRoles(rolesResult);
          setCurrentStage(2); // Move to name input
        } catch (error) {
          console.error("Character extraction failed:", error);
          Sentry.captureException(error);

          setProcessingError({
            hasError: true,
            stage: "character",
            message: "Failed to identify characters",
          });
          setProcessingStage({
            message: "Failed to identify characters",
            isComplete: false,
          });
          return;
        }
      }

      // Move to next stage and update processing message
      setProcessingStage({
        message: "Characters identified",
        isComplete: true,
      });
      setCurrentStage(2);

      // try {
      //     rolesResult = await extractRolesFromText(textResult.text);

      //     if (!rolesResult || rolesResult.length === 0) {
      //         setProcessingError({
      //             hasError: true,
      //             stage: 'character',
      //             message: 'Failed to identify characters'
      //         });
      //         setProcessingStage({
      //             message: 'Failed to identify characters',
      //             isComplete: false,
      //         });
      //         return;
      //     }

      //     setExtractedRoles(rolesResult);
      //     setCurrentStage(2); // Move to name input

      // } catch (error) {
      //     console.error('Character extraction failed:', error);

      //     setProcessingError({
      //         hasError: true,
      //         stage: 'character',
      //         message: 'Failed to identify characters'
      //     });
      //     setProcessingStage({
      //         message: 'Failed to identify characters',
      //         isComplete: false,
      //     });
      //     return;
      // }

      // Stage 3: Start parsing in background
      setIsParsingInBackground(true);
      setProcessingStage({
        message: "Parsing script structure...",
        isComplete: false,
      });

      try {
        if (!shouldContinueProcessing.current) {
          console.log("Processing cancelled");
          return;
        }

        const parsedResult = await parseScriptFromText(
          textResult.text,
          showToast
        );

        if (!shouldContinueProcessing.current) {
          console.log("Processing cancelled");
          return;
        }

        if (!parsedResult || parsedResult.length === 0) {
          setProcessingError({
            hasError: true,
            stage: "parse",
            message: "Unable to parse script structure",
          });
          setProcessingStage({
            message: "Failed to parse script",
            isComplete: false,
          });
          setIsParsingInBackground(false);
          return;
        }

        setParsedScript(parsedResult);
        setIsParsingInBackground(false);
        setProcessingStage({
          message: "Script parsing complete",
          isComplete: true,
        });
      } catch (error) {
        console.error("Script parsing failed:", error);
        Sentry.captureException(error);

        setProcessingError({
          hasError: true,
          stage: "parse",
          message: "Failed to parse script structure",
        });
        setProcessingStage({
          message: "Failed to parse script",
          isComplete: false,
        });
        setIsParsingInBackground(false);
        return;
      }
    } catch (error) {
      console.error("Processing error:", error);
      Sentry.captureException(error);

      setProcessingError({
        hasError: true,
        stage: "general",
        message: "An unexpected error occurred",
      });
      setProcessingStage({ message: "Error occurred", isComplete: false });
    }
  };

  // Handle stage transitions
  const moveToNextStage = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStage((prev) => prev + 1);
      setIsTransitioning(false);
    }, 300);
  };

  // Auto advance from stage 5 to 6 when script is parsed and processed
  useEffect(() => {
    if (currentStage === 5 && parsedScript) {
      // Process approved tags - convert parentheses to brackets and add "tag: " prefix
      const needsTagProcessing = parsedScript.some(
        (it) =>
          it?.type === "line" &&
          typeof it.text === "string" &&
          (it.text.includes("(") || it.text.includes("["))
      );

      if (needsTagProcessing) {
        let changed = false;
        const processedTags = parsedScript.map((item) => {
          if (!(item && item.type === "line" && typeof item.text === "string"))
            return item;

          let processedText = item.text;

          // Process parenthetical text first - convert to brackets if approved
          processedText = processedText.replace(
            /\(([^)]+)\)/g,
            (match, content) => {
              const trimmedContent = content.trim();
              if (isApprovedTag(trimmedContent)) {
                changed = true;
                return `[tag: ${trimmedContent}]`;
              }
              return match; // Keep as is if not approved
            }
          );

          // Process bracketed text - add "tag: " prefix if approved and doesn't already have it
          processedText = processedText.replace(
            /\[([^\]]+)\]/g,
            (match, content) => {
              const trimmedContent = content.trim();
              // Skip if already has "tag: " prefix
              if (/^tag:\s*/i.test(trimmedContent)) {
                return match;
              }
              // Add prefix if approved
              if (isApprovedTag(trimmedContent)) {
                changed = true;
                return `[tag: ${trimmedContent}]`;
              }
              return match; // Keep as is if not approved
            }
          );

          if (processedText !== item.text) {
            return { ...item, text: processedText };
          }
          return item;
        });

        if (changed) {
          setParsedScript(processedTags);
          return;
        }
      }

      // Add line end keywords
      const needsKws = parsedScript.some(
        (it) =>
          it?.type === "line" &&
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (!Array.isArray((it as any).lineEndKeywords) ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (it as any).lineEndKeywords.length === 0)
      );

      if (needsKws) {
        let changed = false;
        const withKeywords = parsedScript.map((item) => {
          if (!(item && item.type === "line" && typeof item.text === "string"))
            return item;

          const needs =
            !Array.isArray(item.lineEndKeywords) ||
            item.lineEndKeywords.length === 0;

          if (!needs) return item;

          // Remove all content within brackets [] or parentheses ()
          const sanitized = item.text.replace(/(\[.*?\]|\(.*?\))/g, "").trim();

          // Clean up any double spaces that might result from removal
          const cleaned = sanitized.replace(/\s+/g, " ");

          const kws = extractLineEndKeywords(cleaned);
          if (kws.length > 0) {
            changed = true;
            return { ...item, lineEndKeywords: kws };
          }
          return item;
        });

        if (changed) {
          setParsedScript(withKeywords);
          return;
        }
      }

      // Check that all kws have been added
      const allLinesHaveKeywords = parsedScript
        .filter(isLine)
        .every(
          (l) =>
            Array.isArray(l.lineEndKeywords) && l.lineEndKeywords.length > 0
        );

      // Extract unique characters from parsed script
      const scriptCharacters = new Set<string>();
      parsedScript.forEach((item) => {
        if (item.type === "line" && item.character) {
          const normalized = item.character.toLowerCase().trim();
          if (!scriptCharacters.has(normalized)) {
            scriptCharacters.add(item.character); // Keep original casing
          }
        }
      });

      // Find characters without voice assignments
      const charactersArray = Array.from(scriptCharacters);
      const missing = charactersArray.filter(
        (char) =>
          !Object.keys(voiceAssignments).some(
            (assigned) =>
              assigned.toLowerCase().trim() === char.toLowerCase().trim()
          )
      );

      setMissingCharacters(missing);

      // Auto-advance if no missing characters
      if (missing.length === 0 && allLinesHaveKeywords) {
        const timer = setTimeout(() => moveToNextStage(), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [currentStage, parsedScript, setParsedScript, voiceAssignments]);

  // Check if can proceed to completion
  const canComplete = () => {
    return (
      scriptName &&
      Object.keys(roleAssignments).length === extractedRoles?.length &&
      Object.keys(voiceAssignments).length === extractedRoles?.length &&
      userRole &&
      parsedScript
    );
  };

  const handleComplete = async () => {
    if (!parsedScript || !scriptName) {
      console.error("Missing script data or name");
      return;
    }

    // Show loading state while saving
    setProcessingStage({ message: "Saving script...", isComplete: false });
    setScriptSaving(true);
    setScriptSaveError(false);

    try {
      // Create normalized lookup maps and enrich the script
      const normalizedVoiceAssignments: Record<string, VoiceAssignment> = {};
      const normalizedRoleAssignments: Record<string, string> = {};

      Object.entries(voiceAssignments).forEach(([character, assignment]) => {
        normalizedVoiceAssignments[character.toLowerCase().trim()] = assignment;
      });

      Object.entries(roleAssignments).forEach(([character, role]) => {
        normalizedRoleAssignments[character.toLowerCase().trim()] = role;
      });

      const enrichedScript = parsedScript.map((item) => {
        if (item.type === "line" && item.character) {
          const normalizedCharacter = item.character.toLowerCase().trim();
          const voiceAssignment =
            normalizedVoiceAssignments[normalizedCharacter];
          const roleAssignment = normalizedRoleAssignments[normalizedCharacter];

          return {
            ...item,
            voiceId: voiceAssignment?.voiceId || "",
            voiceName: voiceAssignment?.voiceName || "",
            role:
              (roleAssignment as "user" | "scene-partner") || "scene-partner",
          };
        }
        return item;
      });

      // Save to Firestore
      await addScript(scriptName, enrichedScript);

      setProcessingStage({
        message: "Script saved successfully!",
        isComplete: true,
      });
      onComplete();
      resetModal();
      onClose();
    } catch (error) {
      console.error("Failed to save script:", error);
      Sentry.captureException(error);
      setProcessingStage({
        message: "Failed to save script",
        isComplete: true,
      });

      // Show error to user
      setScriptSaveError(true);
    } finally {
      setScriptSaving(false);
    }
  };

  const getModalWidth = (stage: number): string => {
    if (processingError.hasError) {
      return "max-w-2xl"; // Compact width for error messages
    }

    switch (stage) {
      case 0: // Voice library setup stage
        return "max-w-xl";
      case 1: // Text extraction stage
        return "max-w-xl";
      case 2: // Name your script stage
        return "max-w-xl";
      case 3:
        // Check if all voices have been assigned (success state)
        if (
          extractedRoles &&
          Object.keys(voiceAssignments).length >= extractedRoles.length
        ) {
          return "max-w-xl";
        }
        // Normal voice assignment view
        return "max-w-4xl";
      case 4: // User role selection stage
        return "max-w-xl";
      case 5:
        // Loading state - waiting for script to parse
        if (!parsedScript) {
          return "max-w-xl";
        }
        // Missing characters - voice assignment
        if (missingCharacters.length > 0) {
          return "max-w-4xl";
        }
        // Success state - all verified
        return "max-w-xl";
      case 6:
        // Script saving state
        if (scriptSaving) {
          return "max-w-xl";
        }
        // Script review
        return "max-w-4xl";
      default:
        return "max-w-4xl";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={scriptSaving ? undefined : handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative bg-primary-light-alt rounded-3xl p-8 w-full ${getModalWidth(
          currentStage
        )} max-h-[95vh] overflow-hidden`}
      >
        {/* Header with Loading Progress */}
        {/* <div className="bg-transparent mb-4 pb-6 border-b border-gray-300">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-header-2 text-primary-dark">
                Script Upload
              </h2>
              <ProcessingIndicator stage={processingStage} />
            </div>
            <button
              onClick={handleClose}
              disabled={scriptSaving}
              className="text-gray-400 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div> */}
        <button
          onClick={handleClose}
          disabled={scriptSaving}
          className="absolute top-8 right-8 text-gray-400 z-[50] disabled:opacity-50 hover:cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content Area with Progressive Inputs */}
        <div className="flex flex-col">
          <div
            className={`transition-all duration-300 ${
              isTransitioning
                ? "opacity-0 translate-x-full"
                : "opacity-100 translate-x-0"
            }`}
          >
            {/* Stage 0: Voice Samples */}
            {currentStage === 0 && (
              <>
                {!(
                  processingError.hasError && processingError.stage === "voice"
                ) ? (
                  <div className="text-center py-12">
                    {/* Animated Logo/Icon */}
                    <div className="w-30 h-30 mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
                        style={{ animationDuration: "1.5s" }}
                      ></div>
                    </div>
                    <h3 className="text-header-3 text-primary-dark mb-1">
                      Script Upload
                    </h3>
                    <p className="text-gray-500">Setting up role selection</p>

                    {/* Fun Loading Messages */}
                    <div className="mt-8 text-gray-400 text-sm">
                      <RotatingTips tipSet="processing" />
                    </div>
                  </div>
                ) : (
                  // Error state
                  <ProcessingError
                    onClose={confirmClose}
                    error={processingError}
                  />
                )}
              </>
            )}

            {/* Stage 1: Loading */}
            {currentStage === 1 && (
              <>
                {!(
                  processingError.hasError && processingError.stage === "text"
                ) ? (
                  <div className="text-center py-12">
                    {/* Animated Logo/Icon */}
                    <div className="w-30 h-30 mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
                        style={{ animationDuration: "1.5s" }}
                      ></div>
                    </div>
                    <h3 className="text-header-3 text-primary-dark mb-1">
                      Script Upload
                    </h3>
                    <p className="text-gray-500">Processing your script</p>

                    {/* Fun Loading Messages */}
                    <div className="mt-8 text-gray-400 text-sm">
                      <RotatingTips tipSet="processing" />
                    </div>
                  </div>
                ) : (
                  // Error state
                  <ProcessingError
                    onClose={confirmClose}
                    error={processingError}
                  />
                )}
              </>
            )}

            {/* Stage 2: Name Script */}
            {currentStage === 2 && (
              <>
                {!(
                  processingError.hasError &&
                  processingError.stage === "character"
                ) ? (
                  <InputStage
                    title="Name Your Script"
                    description="Give it a memorable name"
                  >
                    <input
                      type="text"
                      value={scriptName}
                      onChange={(e) => setScriptName(e.target.value)}
                      onKeyUp={(e) => {
                        if (e.key === "Enter" && scriptName) {
                          moveToNextStage();
                        }
                      }}
                      placeholder="Enter here"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-1 focus:ring-gray-900 focus:border-transparent"
                      autoFocus
                    />
                    <button
                      onClick={moveToNextStage}
                      disabled={!scriptName}
                      className="mt-8 w-full bg-primary-dark text-white py-3 rounded-lg hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 transition"
                    >
                      Continue
                    </button>
                  </InputStage>
                ) : (
                  // Error state
                  <ProcessingError
                    onClose={confirmClose}
                    error={processingError}
                  />
                )}
              </>
            )}

            {/* Stage 3: Assign Voices */}
            {currentStage === 3 &&
              extractedRoles &&
              extractedRoles.length > 0 && (
                <>
                  {!(
                    processingError.hasError &&
                    processingError.stage === "parse"
                  ) ? (
                    (() => {
                      // Get the current index based on how many voices have been assigned
                      const currentIndex = Object.keys(voiceAssignments).length;

                      // Check if we've assigned all roles
                      if (currentIndex >= extractedRoles.length)
                        return (
                          <div className="text-center">
                            <div className="w-20 h-20 mx-auto mb-4 text-green-500">
                              <svg
                                className="w-full h-full"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <p className="text-header-3 text-primary-dark">
                              Voices assigned to all roles!
                            </p>
                          </div>
                        );

                      const currentRole = extractedRoles[currentIndex];

                      return (
                        <InputStage
                          title="Assign Voice:"
                          description={`${currentIndex + 1} of ${
                            extractedRoles.length
                          }`}
                          voiceSelect={`${currentRole}`}
                          fullHeight={true}
                        >
                          <div className="overflow-y-auto max-h-[60vh]">
                            <RoleVoiceAssignment
                              key={currentRole}
                              role={currentRole}
                              voiceSamples={voiceSamples}
                              isLoading={voicesLoading}
                              onAssign={(assignment) => {
                                setConfirmationModal({
                                  isOpen: true,
                                  role: currentRole,
                                  assignment,
                                });
                              }}
                            />
                          </div>

                          {/* Confirmation Modal */}
                          {confirmationModal?.isOpen && (
                            <>
                              {/* Backdrop */}
                              <div
                                className="fixed inset-0 z-50"
                                onClick={() => setConfirmationModal(null)}
                              />

                              {/* Modal container */}
                              <div className="fixed inset-0 z-60 flex items-center justify-center">
                                <div className="relative bg-primary-dark rounded-lg py-6 px-10 max-w-sm mx-4">
                                  <p className="text-white/90 mb-4">
                                    Assign{" "}
                                    <span className="font-medium text-white">
                                      {confirmationModal.assignment.voiceName}
                                    </span>{" "}
                                    to{" "}
                                    <span className="font-medium text-[#91b7f3] uppercase">
                                      {confirmationModal.role}
                                    </span>
                                    ?
                                  </p>
                                  <p className="text-sm text-yellow-300 mb-6">
                                    ⚠️ This selection cannot be changed later.
                                  </p>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => setConfirmationModal(null)}
                                      className="flex-1 px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition hover:cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => {
                                        // Confirm the assignment
                                        setVoiceAssignments((prev) => ({
                                          ...prev,
                                          [confirmationModal.role]:
                                            confirmationModal.assignment,
                                        }));
                                        setConfirmationModal(null);

                                        // Check if this was the last role
                                        if (
                                          currentIndex + 1 >=
                                          extractedRoles.length
                                        ) {
                                          // Auto-advance after last role
                                          setTimeout(
                                            () => moveToNextStage(),
                                            500
                                          );
                                        }
                                      }}
                                      className="flex-1 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-white/70 transition hover:cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </InputStage>
                      );
                    })()
                  ) : (
                    // Error state
                    <ProcessingError
                      onClose={confirmClose}
                      error={processingError}
                    />
                  )}
                </>
              )}

            {/* Stage 4: Select User Role */}
            {currentStage === 4 && (
              <InputStage
                title="Select Your Role"
                description="Which character will you be playing?"
              >
                <div className="space-y-2">
                  {extractedRoles &&
                    extractedRoles.map((role) => (
                      <button
                        key={role}
                        onClick={() => {
                          setUserRole(role);
                          // Automatically assign other roles
                          const assignments: Record<
                            string,
                            "user" | "scene-partner"
                          > = {};
                          extractedRoles.forEach((r) => {
                            assignments[r] =
                              r === role ? "user" : "scene-partner";
                          });
                          setRoleAssignments(assignments);
                          moveToNextStage();
                        }}
                        className="w-full text-left px-4 py-3 border border-gray-300 bg-white hover:cursor-pointer hover:bg-[#91b7f3] text-primary-dark hover:text-white hover:font-semibold rounded-lg uppercase"
                      >
                        {role}
                      </button>
                    ))}
                </div>
              </InputStage>
            )}

            {/* Stage 5: Waiting for Parsing / Complete */}
            {currentStage === 5 && (
              <>
                {!parsedScript ? (
                  // Loading state - waiting for script to parse
                  <div className="text-center py-8">
                    <div className="w-30 h-30 mx-auto mb-6 relative">
                      <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
                      <div
                        className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
                        style={{ animationDuration: "1.5s" }}
                      ></div>
                    </div>
                    <h3 className="text-header-3 text-primary-dark mb-1">
                      Finalizing Script
                    </h3>
                    <p className="text-gray-500">This may take a few minutes</p>
                    <div className="mt-8 text-white/60 text-sm">
                      <RotatingTips tipSet="finalizing" />
                    </div>
                  </div>
                ) : missingCharacters.length > 0 ? (
                  // Show voice assignment for missing characters
                  <InputStage
                    title="Additional Characters Found"
                    description={`We found ${
                      missingCharacters.length
                    } more character${
                      missingCharacters.length > 1 ? "s" : ""
                    } in your script`}
                  >
                    <div className="mb-8 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Assigning voice for:{" "}
                        <span className="font-semibold">
                          {missingCharacters[0]}
                        </span>
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        {missingCharacters.length - 1} more character
                        {missingCharacters.length - 1 !== 1 ? "s" : ""}{" "}
                        remaining
                      </p>
                    </div>

                    <div className="overflow-y-auto max-h-[50vh]">
                      <RoleVoiceAssignment
                        key={missingCharacters[0]}
                        role={missingCharacters[0]}
                        voiceSamples={voiceSamples}
                        isLoading={voicesLoading}
                        onAssign={(assignment) => {
                          // Assign voice
                          setVoiceAssignments((prev) => ({
                            ...prev,
                            [missingCharacters[0]]: assignment,
                          }));

                          // Add to extracted roles if needed
                          if (!extractedRoles?.includes(missingCharacters[0])) {
                            setExtractedRoles((prev) => [
                              ...(prev || []),
                              missingCharacters[0],
                            ]);
                          }
                        }}
                      />
                    </div>
                  </InputStage>
                ) : (
                  // All characters have voices - show success
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 text-green-500">
                      <svg
                        className="w-full h-full"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-header-3 text-primary-dark mb-1">
                      All characters verified!
                    </p>
                    <p className="text-sm text-gray-500">
                      Moving to script review...
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Stage 6: Script Review */}
          {currentStage === 6 && (
            <InputStage
              title="Edit Your Script"
              description="Feel free to click on the lines to edit them if you need to."
              fullHeight={false}
            >
              <div className="flex flex-col max-h-[80vh]">
                <div className="flex-1 border border-gray-200 rounded-lg p-4 bg-transparent overflow-y-auto">
                  {scriptSaving ? (
                    <div className="text-center py-8">
                      <div className="w-30 h-30 mx-auto mb-6 relative">
                        <div className="absolute inset-0 border-4 border-gray-800/20 rounded-full" />
                        <div className="absolute inset-0 border-4 border-gray-800 border-t-transparent rounded-full animate-spin" />
                        <div
                          className="absolute inset-2 border-2 border-gray-800/40 border-b-transparent rounded-full animate-spin animate-reverse"
                          style={{ animationDuration: "1.5s" }}
                        />
                        <h3 className="text-header-3 text-primary-dark mb-1">
                          Saving Script
                        </h3>
                        <p className="text-gray-500">{"You're almost done!"}</p>
                      </div>
                    </div>
                  ) : (
                    <ScriptRenderer
                      script={parsedScript}
                      onScriptUpdate={setParsedScript}
                      editable
                      onClose={confirmClose}
                    />
                  )}
                </div>

                {/* Save button */}
                <div className="pt-8 flex-shrink-0">
                  {scriptSaveError && (
                    <p className="text-sm text-red-600 mb-2">
                      Error saving script, please try again.
                    </p>
                  )}
                  <button
                    onClick={handleComplete}
                    disabled={!canComplete || scriptSaving}
                    className="w-full bg-primary-dark text-white px-6 py-3 rounded-lg hover:cursor-pointer transition font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {scriptSaving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </InputStage>
          )}
        </div>

        {/* Progress Indicators */}
        <div className="pt-8">
          <div className="flex justify-between items-center gap-2">
            {[1, 2, 3, 4, 5, 6].map((stage) => (
              <div
                key={stage}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  currentStage >= stage ? "bg-primary-dark" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Close Confirmation Modal */}
        <Dialog {...dialogProps} />
      </div>
    </div>
  );
}

// Sub-components
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ProcessingIndicator = ({
  stage,
}: {
  stage: { message: string; isComplete: boolean };
}) => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!stage.isComplete) {
      const interval = setInterval(() => {
        setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [stage.isComplete]);

  if (!stage.message) return null;

  return (
    <div className="flex items-center space-x-2">
      <div
        className={`w-2 h-2 rounded-full ${
          stage.isComplete ? "bg-green-400" : "bg-gray-400 animate-pulse"
        }`}
      />
      <span className="text-md text-gray-400">
        {stage.message}
        {stage.isComplete ? "!" : dots}
      </span>
    </div>
  );
};

const RotatingTips = ({ tipSet }: { tipSet: "processing" | "finalizing" }) => {
  const tips = {
    processing: [
      "💡 Tip: You can change your role later, but your script name and voice selections are final!",
      "💡 Tip: Preview how voices sound before making a selection",
      "💡 Tip: Select voices that match your character's personality",
      "⏳ Sorry, this is taking longer than expected...",
    ],
    finalizing: [
      "💡 Tip: Make sure you're in a quiet environment for the best speech recognition",
      "💡 Tip: Practice makes perfect - rehearse each scene multiple times",
      "🎬 Tip: Try different emotional approaches to find your character",
      "🎬 Tip: Take notes on your character's motivations",
      "🎯 Tip: Focus on one scene at a time for better results",
    ],
  };

  const [currentTipIndex, setCurrentTipIndex] = useState(() =>
    tipSet === "finalizing"
      ? Math.floor(Math.random() * tips.finalizing.length)
      : 0
  );

  useEffect(() => {
    // Reset start index when tipSet changes
    setCurrentTipIndex(
      tipSet === "finalizing"
        ? Math.floor(Math.random() * tips.finalizing.length)
        : 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipSet]);

  useEffect(() => {
    const isProcessing = tipSet === "processing";
    const isAtLastTip =
      isProcessing && currentTipIndex === tips.processing.length - 1;

    // If we're at the final processing tip, stop rotating
    if (isAtLastTip) return;

    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => {
        if (isProcessing) {
          // Stop at last index
          return Math.min(prev + 1, tips.processing.length - 1);
        } else {
          // Keep cycling for finalizing
          return (prev + 1) % tips.finalizing.length;
        }
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [tipSet, currentTipIndex, tips.processing.length, tips.finalizing.length]);

  return (
    <div className="mt-6 min-h-[24px] flex items-center justify-center">
      <p className="text-md text-gray-400 animate-fadeIn">
        {tips[tipSet][currentTipIndex]}
      </p>
    </div>
  );
};

const InputStage = ({
  title,
  description,
  children,
  fullHeight = false,
  voiceSelect,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  fullHeight?: boolean;
  voiceSelect?: string;
}) => {
  if (fullHeight) {
    return (
      <div className="animate-fadeIn flex flex-col h-full">
        <div className="flex-shrink-0">
          <h3 className="text-primary-dark mb-1 flex items-center flex-wrap items-center gap-2">
            <span className="text-header-2">{title}</span>
            {voiceSelect && (
              <span className="inline-block bg-[#91b7f3] text-white text-[20px] font-semibold px-3 py-1 ml-1 mt-1 rounded-[10px] uppercase">
                {voiceSelect}
              </span>
            )}
          </h3>
          <p className="text-gray-500 mb-6">{description}</p>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      <h3 className="text-header-2 text-primary-dark mb-1 flex items-center flex-wrap gap-2">
        {title}
        {voiceSelect && (
          <span className="inline-block bg-[#91b7f3] text-white text-[16px] font-semibold px-3 py-1 rounded-[10px] uppercase">
            {voiceSelect}
          </span>
        )}
      </h3>
      <p className="text-gray-500 mb-6">{description}</p>
      {children}
    </div>
  );
};

const RoleVoiceAssignment = ({
  voiceSamples,
  onAssign,
  isLoading = false,
}: RoleVoiceAssignmentProps) => {
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [selectedGender, setSelectedGender] = useState<
    "male" | "female" | "non-binary"
  >("female");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
      audioRef.current = null;
    } else {
      audioRef.current?.pause();

      const audio = new Audio(url);
      audioRef.current = audio;
      setPlayingUrl(url);
      audio.play();

      audio.onended = () => {
        setPlayingUrl(null);
        audioRef.current = null;
      };
    }
  };

  const handleSelectVoice = (sample: VoiceSample) => {
    setSelectedVoiceId(sample.voiceId);
    onAssign({
      voiceId: sample.voiceId,
      voiceName: sample.name,
    });
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  // Filter voices by selected gender
  const filteredVoices =
    voiceSamples?.filter(
      (sample) => sample.gender?.toLowerCase() === selectedGender
    ) || [];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading voices...</p>
      </div>
    );
  }

  if (!voiceSamples || voiceSamples.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">No voices available</div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Gender Toggle */}
      <div className="flex justify-center pb-4">
        <div className="inline-flex rounded-full bg-primary-light p-1">
          <button
            onClick={() => setSelectedGender("female")}
            className={`
        flex items-center justify-center gap-2 px-2 py-2 w-[110px] rounded-full transition-all duration-200
        ${
          selectedGender === "female"
            ? "bg-primary-dark text-white"
            : "text-gray-600 hover:text-gray-900"
        }
      `}
          >
            <Venus className="w-5 h-5" />
            <span className="text-sm">Female</span>
          </button>
          <button
            onClick={() => setSelectedGender("male")}
            className={`
        flex items-center justify-center gap-2 px-2 py-2 w-[110px] rounded-full transition-all duration-200
        ${
          selectedGender === "male"
            ? "bg-primary-dark text-white"
            : "text-gray-600 hover:text-gray-900"
        }
      `}
          >
            <Mars className="w-5 h-5" />
            <span className="text-sm">Male</span>
          </button>
          <button
            onClick={() => setSelectedGender("non-binary")}
            className={`
        flex items-center justify-center gap-2 px-2 py-2 w-[110px] rounded-full transition-all duration-200
        ${
          selectedGender === "non-binary"
            ? "bg-primary-dark text-white"
            : "text-gray-600 hover:text-gray-900"
        }
      `}
          >
            <NonBinary className="w-5 h-5" />
            <span className="text-sm">Neutral</span>
          </button>
        </div>
      </div>

      {/* Voice Cards */}
      {filteredVoices.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No {selectedGender} voices available
        </div>
      ) : (
        <div className="flex flex-wrap gap-4 justify-center">
          {filteredVoices
            .sort((a, b) => {
              const crowdFavorites = ["Jessica", "Adam", "Jordan"];
              const aIsFavorite = crowdFavorites.includes(a.name);
              const bIsFavorite = crowdFavorites.includes(b.name);

              // If a is favorite and b is not, a comes first
              if (aIsFavorite && !bIsFavorite) return -1;
              // If b is favorite and a is not, b comes first
              if (!aIsFavorite && bIsFavorite) return 1;
              // Otherwise maintain original order
              return 0;
            })
            .map((sample) => (
              <div
                key={sample.voiceId}
                onClick={() => handleSelectVoice(sample)}
                className={`
        w-55 h-50 p-5 rounded-2xl cursor-pointer transition-all duration-300
        bg-[#A8A8A8]/10 hover:bg-[#A8A8A8]/20 flex flex-col justify-between
        ${
          selectedVoiceId === sample.voiceId
            ? "ring-2 ring-primary-dark-alt"
            : ""
        }
      `}
              >
                {/* Top section: Name + Description */}
                <div>
                  <h4 className="font-semibold text-primary-dark text-md">
                    {sample.name}
                    {["Jessica", "Adam", "Jordan"].includes(sample.name) && (
                      <span className="text-sm text-yellow-500 font-normal ml-1">
                        (crowd favorite)
                      </span>
                    )}
                  </h4>

                  <p className="text-sm text-primary-dark/80 mt-2 line-clamp-3 leading-relaxed">
                    {sample.description}
                  </p>
                </div>

                {/* Bottom section: Play button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(sample.url, e);
                  }}
                  className={`
          self-center flex items-center justify-center w-8 h-8 rounded-full cursor-pointer hover:scale-105 active:scale-95
          transition-all duration-300 text-white font-medium bg-primary-dark shadow-md
        `}
                >
                  {playingUrl === sample.url ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

const EditableLine = ({ item, onUpdate, onClose }: EditableLineProps) => {
  const [saving, setSaving] = useState(false);
  const originalTextRef = useRef<string>("");
  const editableRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);
  const [draftText, setDraftText] = useState(() => {
    const trimmedText = item.text.trim();
    originalTextRef.current = trimmedText;
    return trimmedText;
  });

  // History of text values
  const historyRef = useRef<string[]>([]);
  const redoRef = useRef<string[]>([]);

  // Check for updates before save
  const hasContentChanged = (currentText: string): boolean => {
    const current = currentText.trim();
    const original = originalTextRef.current;
    return current !== original;
  };

  // Apply styling to bracketed text
  const applyBracketStyling = (text: string): string => {
    return text.replace(
      /(\[tag:\s*[^\]]*\])/g,
      '<span class="text-purple-700">$1</span>'
    );
  };

  // Get cursor position in contentEditable
  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editableRef.current!);
    preRange.setEnd(range.startContainer, range.startOffset);

    const start = preRange.toString().length;
    return start;
  };

  // Restore cursor position in contentEditable
  const restoreCursorPosition = (position: number) => {
    if (!editableRef.current) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let charCount = 0;
    const nodeStack: Node[] = [editableRef.current];
    let foundStart = false;

    while (nodeStack.length > 0 && !foundStart) {
      const node = nodeStack.pop()!;

      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;
        if (charCount + textLength >= position) {
          range.setStart(node, position - charCount);
          foundStart = true;
        } else {
          charCount += textLength;
        }
      } else {
        // Add child nodes in reverse order to process them in order
        for (let i = node.childNodes.length - 1; i >= 0; i--) {
          nodeStack.push(node.childNodes[i]);
        }
      }
    }

    if (foundStart) {
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  // Check if cursor is at the edge of an audio tag
  const checkAudioTagBoundary = (text: string, cursorPos: number) => {
    // Find all audio tags with "tag:" prefix
    const regex = /\[tag:\s*[^\]]*\]/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const tagStart = match.index;
      const tagEnd = match.index + match[0].length;
      const immutableEnd = tagStart + 5; // "[tag: ".length = 5

      // Check if cursor is at the boundary of this tag
      if (cursorPos === tagEnd || cursorPos === tagStart) {
        return { tagStart, tagEnd, tagContent: match[0], immutableEnd };
      }

      // Check if cursor is inside the immutable part "[tag: "
      if (cursorPos > tagStart && cursorPos <= immutableEnd) {
        return { tagStart, tagEnd, tagContent: match[0], immutableEnd };
      }

      // Check if cursor is anywhere else inside the tag
      if (cursorPos > immutableEnd && cursorPos < tagEnd) {
        return { tagStart, tagEnd, tagContent: match[0], immutableEnd };
      }
    }

    return null;
  };

  // Select an entire audio tag
  const selectAudioTag = (tagStart: number, tagEnd: number) => {
    if (!editableRef.current) return;

    const selection = window.getSelection();
    const range = document.createRange();

    let charCount = 0;
    let startNode: Node | null = null;
    let endNode: Node | null = null;
    let startOffset = 0;
    let endOffset = 0;

    const findNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0;

        if (!startNode && charCount + textLength > tagStart) {
          startNode = node;
          startOffset = tagStart - charCount;
        }

        if (!endNode && charCount + textLength >= tagEnd) {
          endNode = node;
          endOffset = tagEnd - charCount;
        }

        charCount += textLength;
      } else {
        for (let i = 0; i < node.childNodes.length; i++) {
          findNodes(node.childNodes[i]);
          if (startNode && endNode) break;
        }
      }
    };

    findNodes(editableRef.current);

    if (startNode && endNode) {
      range.setStart(startNode, startOffset);
      range.setEnd(endNode, endOffset);
      selection?.removeAllRanges();
      selection?.addRange(range);
      return true;
    }

    return false;
  };

  // Set initial text with styling
  useEffect(() => {
    if (
      editableRef.current &&
      editableRef.current.innerHTML !== applyBracketStyling(item.text)
    ) {
      editableRef.current.innerHTML = applyBracketStyling(item.text);
    }
  }, [item.text]);

  // Auto-focus on mount
  useEffect(() => {
    if (editableRef.current) {
      editableRef.current.focus();
      // Place cursor at end of text
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, []);

  // Auto-resize based on content
  useEffect(() => {
    if (editableRef.current) {
      editableRef.current.style.height = "auto";
      editableRef.current.style.height = `${editableRef.current.scrollHeight}px`;
    }
  }, [draftText]);

  // Handle keyboard input for auto-closing brackets
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle backspace and delete for smart audio tag deletion
    if ((e.key === "Backspace" || e.key === "Delete") && !isComposing.current) {
      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      if (range && editableRef.current) {
        const text = editableRef.current.innerText || "";
        const cursorPos = saveCursorPosition();

        if (cursorPos !== null) {
          // Check if we're about to delete any part of an audio tag structure
          let aboutToDeleteImmutable = false;
          let charToDelete = "";

          if (e.key === "Backspace" && cursorPos > 0) {
            charToDelete = text[cursorPos - 1];
            // Check if character before cursor is part of immutable structure
            aboutToDeleteImmutable =
              charToDelete === "[" ||
              charToDelete === "]" ||
              charToDelete === "t" ||
              charToDelete === "a" ||
              charToDelete === "g" ||
              charToDelete === ":";
          } else if (e.key === "Delete" && cursorPos < text.length) {
            charToDelete = text[cursorPos];
            // Check if character at cursor is part of immutable structure
            aboutToDeleteImmutable =
              charToDelete === "[" ||
              charToDelete === "]" ||
              charToDelete === "t" ||
              charToDelete === "a" ||
              charToDelete === "g" ||
              charToDelete === ":";
          }

          if (aboutToDeleteImmutable) {
            // Find the audio tag that contains this character
            const tagInfo = checkAudioTagBoundary(text, cursorPos);

            if (tagInfo) {
              // Additional check: make sure we're actually trying to delete immutable parts
              let isImmutableDeletion = false;

              if (e.key === "Backspace") {
                // Check if we're trying to delete opening bracket, "tag", colon, or space after colon
                if (cursorPos <= tagInfo.immutableEnd) {
                  isImmutableDeletion = true;
                }
                // Also protect closing bracket
                if (
                  cursorPos === tagInfo.tagEnd &&
                  text[cursorPos - 1] === "]"
                ) {
                  isImmutableDeletion = true;
                }
              } else if (e.key === "Delete") {
                // Check if we're trying to delete any part of "[tag: " or closing bracket
                if (
                  cursorPos < tagInfo.immutableEnd ||
                  (cursorPos === tagInfo.tagEnd - 1 && text[cursorPos] === "]")
                ) {
                  isImmutableDeletion = true;
                }
              }

              if (isImmutableDeletion) {
                // Check if tag is already selected
                const currentSelection = selection?.toString();
                if (currentSelection === tagInfo.tagContent) {
                  // Tag is already selected, delete it
                  e.preventDefault();
                  range.deleteContents();
                  handleInput();
                  return;
                }

                // Otherwise, select the entire audio tag
                e.preventDefault();
                if (selectAudioTag(tagInfo.tagStart, tagInfo.tagEnd)) {
                  // The tag is now selected, user needs to press delete again
                  return;
                }
              }
            }
          }
        }
      }
    }

    // Shortcuts
    const isAudioTagTrigger = e.key === "[";
    const isUndo =
      (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey;
    const isRedo =
      (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && e.shiftKey;

    if (isUndo) {
      e.preventDefault();
      if (historyRef.current.length > 1) {
        const current = historyRef.current.pop()!; // current value
        redoRef.current.push(current);
        const prev = historyRef.current[historyRef.current.length - 1];
        restoreContent(prev);
      }
      return;
    }

    if (isRedo) {
      e.preventDefault();
      if (redoRef.current.length > 0) {
        const next = redoRef.current.pop()!;
        historyRef.current.push(next);
        restoreContent(next);
      }
      return;
    }

    if (isAudioTagTrigger && !isComposing.current) {
      e.preventDefault();

      const selection = window.getSelection();
      const range = selection?.getRangeAt(0);

      if (range) {
        // Store if there's selected text
        const hasSelection = !range.collapsed;

        if (hasSelection) {
          // Move to start of selection without deleting
          range.collapse(true); // true = collapse to start
        }

        // Get the text content and cursor position context
        const container = range.commonAncestorContainer;
        const textContent = container.textContent || "";
        const offset = range.startOffset;

        // Check characters before and after cursor
        const charBefore = offset > 0 ? textContent[offset - 1] : "";
        const charAfter =
          offset < textContent.length ? textContent[offset] : "";

        // Determine if we need spaces
        const needSpaceBefore =
          offset > 0 && charBefore && charBefore !== " " && charBefore !== "\n";
        const needSpaceAfter =
          charAfter && charAfter !== " " && charAfter !== "\n";

        // Create text nodes
        const fragments = [];

        if (needSpaceBefore) {
          fragments.push(document.createTextNode(" "));
        }

        const openBracket = document.createTextNode("[");
        const tagPrefix = document.createTextNode("tag: ");
        const closeBracket = document.createTextNode("]");

        fragments.push(openBracket, tagPrefix, closeBracket);

        if (needSpaceAfter) {
          fragments.push(document.createTextNode(" "));
        }

        // Insert all fragments
        fragments.forEach((node) => {
          range.insertNode(node);
          range.setStartAfter(node);
        });

        // Position cursor after "tag: " and before the closing bracket
        range.setStartAfter(tagPrefix);
        range.setEndBefore(closeBracket);
        selection?.removeAllRanges();
        selection?.addRange(range);

        // Trigger input handler to update state and apply styling
        handleInput();
      }
    }
  };

  // Handle input changes
  const handleInput = () => {
    if (editableRef.current) {
      const text = editableRef.current.innerText || "";

      // Push into history only if different from last entry
      if (historyRef.current[historyRef.current.length - 1] !== text) {
        historyRef.current.push(text);
        redoRef.current = []; // clear redo stack
      }

      setDraftText(text);

      // Save cursor position
      const cursorPos = saveCursorPosition();

      // Apply styling
      editableRef.current.innerHTML = applyBracketStyling(text);

      // Restore cursor position
      if (cursorPos !== null) {
        restoreCursorPosition(cursorPos);
      }
    }
  };

  // Add this function to normalize audio tag spacing
  const normalizeAudioTagSpacing = (text: string): string => {
    return (
      text
        // First normalize spacing inside tags
        .replace(/\[tag:\s*(.*?)\]/g, (match, content) => {
          const trimmedContent = content.trim();
          return trimmedContent ? `[tag: ${trimmedContent}]` : "";
        })
        // Collapse extra spaces left behind if tag was removed
        .replace(/\s{2,}/g, " ")
        .trim()
    );
  };

  const handleSave = async () => {
    if (!editableRef.current) return;

    const currentText = editableRef.current.innerText || "";
    const normalizedText = normalizeAudioTagSpacing(currentText || draftText);

    if (hasContentChanged(normalizedText)) {
      try {
        setSaving(true);
        await Promise.resolve(onUpdate({ ...item, text: normalizedText }));
      } finally {
        setSaving(false);
      }
    } else {
      onClose();
    }
  };

  // Handle paste to ensure plain text
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");

    const selection = window.getSelection();
    const range = selection?.getRangeAt(0);

    if (range) {
      range.deleteContents();
      const textNode = document.createTextNode(text);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    handleInput();
  };

  // Handle undo/redo
  const restoreContent = (text: string) => {
    if (editableRef.current) {
      setDraftText(text);
      editableRef.current.innerHTML = applyBracketStyling(text);
      // place cursor at end
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  return (
    <div className="pl-4 border-l-4 border-gray-300">
      <div className="text-base leading-relaxed">
        <div
          ref={editableRef}
          contentEditable
          className="cursor-text w-full border rounded p-2 text-base leading-relaxed text-gray-700 min-h-[2.5rem] focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={onClose}
          onCompositionStart={() => (isComposing.current = true)}
          onCompositionEnd={() => (isComposing.current = false)}
          suppressContentEditableWarning={true}
          style={{
            minHeight: "2.5rem",
            overflowY: "hidden",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            className={`px-3 py-1 text-sm text-white rounded ${
              saving
                ? "bg-yellow-400/60 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-500"
            }`}
            onMouseDown={handleSave}
            disabled={saving}
          >
            {saving ? "Updating" : "Save"}
          </button>

          {/* Audio tag tip */}
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <div className="relative group inline-flex">
              <svg
                className="w-5 h-5 text-gray-400 cursor-help"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>

              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 w-64 z-10">
                <div className="space-y-1">
                  <p>{"• Use for emotions, sounds, or pauses"}</p>
                  <p>
                    {
                      "• Examples: [sigh], [pause], [chuckle], [excited], [angry], [whisper]"
                    }
                  </p>
                  <p>{"• Keep it simple: 1 word preferred, 2 max"}</p>
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-[1px]">
                  <div className="border-4 border-transparent border-t-gray-800"></div>
                </div>
              </div>
            </div>
            <span>{`Insert audio tags by pressing open bracket key ( [ )`}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ScriptRenderer = ({
  script,
  onScriptUpdate,
  editable = false,
  onClose,
}: ScriptRendererProps) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Error handling if there is no parsed script here
  if (!script) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            An error occurred
          </p>
          <p className="text-gray-600 mb-4">
            Script is unavailable. Please close and try again.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleLineClick = (index: number, item: ScriptElement) => {
    if (editable && item.type === "line") {
      setEditingIndex(index);
    }
  };

  const handleUpdate = (index: number, updatedItem: ScriptElement) => {
    // Add lineEndKeywords if it's a line element
    if (updatedItem.type === "line" && typeof updatedItem.text === "string") {
      // Remove double spaces and trim
      const cleanedText = updatedItem.text.replace(/\s+/g, " ").trim();

      // Remove all content within brackets including the brackets
      const sanitized = cleanedText
        .replace(/\[.*?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      updatedItem = {
        ...updatedItem,
        text: cleanedText,
        lineEndKeywords: extractLineEndKeywords(sanitized),
      };
      console.log("Updated keywords:", updatedItem.lineEndKeywords);
    }

    const updatedScript = [...script];
    updatedScript[index] = updatedItem;
    onScriptUpdate?.(updatedScript);
    setEditingIndex(null);
  };

  const renderLineText = (text: string, elementIndex: number) => {
    const regex = /(\[[^\]]+\]|\([^)]*\))|([^\s\[\]()]+)/g;
    const segments: { type: "brackets" | "word"; content: string }[] = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        segments.push({ type: "brackets", content: match[1] });
      } else if (match[2]) {
        segments.push({ type: "word", content: match[2] });
      }
    }

    return segments.map((segment, i) => {
      if (segment.type === "brackets") {
        const inner = segment.content.slice(1, -1).trim();

        if (inner.toLowerCase().startsWith("tag:")) {
          const tagText = inner.slice(4).trim(); // remove "tag:"
          return (
            <span
              key={`tag-${elementIndex}-${i}`}
              className="inline-block rounded-full bg-purple-600 text-white text-sm font-medium px-3 py-0.5 mr-1"
            >
              {tagText}
            </span>
          );
        }

        return (
          <span
            key={`bracket-${elementIndex}-${i}`}
            className="text-gray-400 italic mr-1"
          >
            {segment.content}
          </span>
        );
      }

      // Normal word
      return (
        <span key={`word-${elementIndex}-${i}`} className="text-gray-800 mr-1">
          {segment.content}
        </span>
      );
    });
  };

  const renderScriptElement = (item: ScriptElement, index: number) => {
    const isEditing = editingIndex === index;

    switch (item.type) {
      case "scene":
        return (
          <div key={index} className="mb-6">
            <div className="font-bold text-gray-800 uppercase tracking-wide">
              {item.text}
            </div>
          </div>
        );

      case "line":
        if (isEditing) {
          return (
            <div key={index} className="mb-4 mx-4 sm:mx-8 lg:mx-12">
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 uppercase tracking-wide text-center mb-2">
                  {item.character}
                </span>
                <EditableLine
                  item={item}
                  onUpdate={(updatedItem) => handleUpdate(index, updatedItem)}
                  onClose={() => setEditingIndex(null)}
                />
              </div>
            </div>
          );
        }

        return (
          <div
            key={index}
            className={`mb-4 mx-4 sm:mx-8 lg:mx-12 ${
              editable
                ? "cursor-pointer hover:bg-gray-100 border-gray-200 hover:shadow-sm rounded-lg p-2 transition-colors"
                : ""
            }`}
            onClick={() => handleLineClick(index, item)}
          >
            <div className="flex flex-col">
              <span className="font-bold text-gray-900 uppercase tracking-wide text-center mb-1">
                {item.character}
              </span>
              <div className="text-gray-800 leading-relaxed pl-4 relative group flex flex-wrap">
                {renderLineText(item.text, index)}
              </div>
            </div>
          </div>
        );

      case "direction":
        return (
          <div key={index} className="mb-4 mx-6 sm:mx-12 lg:mx-16">
            <div className="text-gray-600 italic">({item.text})</div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {script.map((item, index) => renderScriptElement(item, index))}
    </div>
  );
};

const ProcessingError: React.FC<ProcessingErrorProps> = ({
  error,
  onClose,
}) => {
  const getErrorDetails = () => {
    switch (error.stage) {
      case "voice":
        return {
          title: "Voice Library Failed",
          tips: ["Please check your internet connection and try again."],
        };
      case "text":
        return {
          title: "Text Extraction Failed",
          tips: [
            "The file might be an image without selectable text",
            "The PDF might be scanned without text recognition",
            "The file could be corrupted or empty",
          ],
        };
      case "character":
        return {
          title: "Character Identification Failed",
          tips: [
            "The script format might not be recognized",
            "Character names might not be properly formatted",
            "The document might not be a screenplay format",
          ],
        };
      case "parse":
        return {
          title: "Script Parsing Failed",
          tips: [
            "The script structure might be too complex",
            "There might be formatting inconsistencies",
            "Special characters might be causing issues",
          ],
        };
      case "general":
      default:
        return {
          title: "Processing Error",
          tips: [
            "There was an unexpected error",
            "The file might be too large",
            "Network connection might be unstable",
          ],
        };
    }
  };

  const details = getErrorDetails();

  return (
    <div className="text-center">
      {/* Error Icon */}
      <div className="w-28 h-28 mx-auto mb-6 relative">
        <div className="absolute inset-0 bg-red-100 rounded-full flex items-center justify-center">
          <svg
            className="w-12 h-12 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        {details.title}
      </h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">{error.message}</p>

      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto mb-6">
        <p className="text-sm text-red-800 font-medium mb-2">
          Possible causes:
        </p>
        <ul className="text-left text-sm text-red-700 space-y-1">
          {details.tips.map((tip, index) => (
            <li key={index} className="flex items-start">
              <span className="mr-2">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
        >
          Try Another File
        </button>
      </div>
    </div>
  );
};
