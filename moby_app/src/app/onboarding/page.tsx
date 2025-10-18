"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Upload, ArrowRight } from "lucide-react";
import { uploadHeadshot, uploadResume } from "@/lib/firebase/client/media";
import { addUser } from "@/lib/firebase/client/user";
import { auth } from "@/lib/firebase/client/config/app";
import { UserProfile, ethnicities } from "@/types/profile";
import Image from "next/image";

type LoadingState = "idle" | "headshot" | "resume" | "profile";

type ConversationItem = {
  id: string;
  type: "question" | "answer";
  content: string;
  fieldName?: keyof UserProfile | "headshot" | "resume";
  value?: any;
};

const TypewriterText = ({
  text,
  onComplete,
}: {
  text: string;
  onComplete?: () => void;
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 10); // Adjust speed here (lower = faster)

      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return (
    <span className="relative">
      {displayedText}
      {currentIndex < text.length && (
        <span
          className="inline-block w-[2px] h-[1.2em] bg-primary-dark-alt ml-[1px] animate-blink absolute top-0"
          style={{ left: "100%" }}
        ></span>
      )}
    </span>
  );
};

// To handle multi-line typewriter effect
const MultiLineTypewriter = ({
  lines,
  onComplete,
}: {
  lines: string[];
  onComplete?: () => void;
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Reset when lines change (new question)
    setCurrentLineIndex(0);
    setCompletedLines([]);
    setIsComplete(false);
  }, [lines.join("|")]); // Use joined string as dependency to detect content change

  const handleLineComplete = () => {
    if (isComplete) return; // Prevent re-execution

    const currentLine = lines[currentLineIndex];
    setCompletedLines((prev) => [...prev, currentLine]);

    if (currentLineIndex < lines.length - 1) {
      setTimeout(() => {
        setCurrentLineIndex((prev) => prev + 1);
      }, 100); // Small delay between lines
    } else {
      setIsComplete(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 200);
    }
  };

  // If complete, just render all lines statically
  if (isComplete) {
    return (
      <>
        {lines.map((line, idx) => (
          <div key={idx} className={idx > 0 ? "mt-0" : ""}>
            {line}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {completedLines.map((line, idx) => (
        <div key={idx} className={idx > 0 ? "mt-0" : ""}>
          {line}
        </div>
      ))}
      {currentLineIndex < lines.length &&
        !completedLines.includes(lines[currentLineIndex]) && (
          <div className={currentLineIndex > 0 ? "mt-0" : ""}>
            <TypewriterText
              key={`line-${currentLineIndex}`}
              text={lines[currentLineIndex]}
              onComplete={handleLineComplete}
            />
          </div>
        )}
    </>
  );
};

function ChatOnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finalDestination = searchParams.get("next") || "/tracker";
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<ConversationItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [selectedEthnicities, setSelectedEthnicities] = useState<string[]>([]);
  const [loading, setLoading] = useState<LoadingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [isProcessingAnswer, setIsProcessingAnswer] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    firstName: "",
    lastName: "",
    age: 25,
    ethnicity: [],
    height: 66,
  });
  const [firstNameValue, setFirstNameValue] = useState("");
  const [lastNameValue, setLastNameValue] = useState("");

  const questions = [
    {
      text: "I just need to ask you a few quick questions to personalize your experience. | To get started, what's your name?",
      field: "name",
      type: "name",
    },
    {
      text: "How old are you?",
      field: "age",
      type: "number",
      getDynamicText: () =>
        `Nice to meet you ${firstNameValue}! How old are you?`,
    },
    {
      text: "What's your ethnic background? (Select all that apply)",
      field: "ethnicity",
      type: "ethnicity",
    },
    {
      text: "How tall are you? (in inches, e.g., 66 for 5'6\")",
      field: "height",
      type: "number",
    },
    {
      text: "Would you like to upload a professional headshot?",
      field: "headshot",
      type: "file",
    },
    {
      text: "Last step! Upload your resume (PDF or DOCX)",
      field: "resume",
      type: "file",
    },
  ];

  const scrollToPosition = () => {
    setTimeout(() => {
      if (scrollAreaRef.current && contentRef.current) {
        const containerHeight = scrollAreaRef.current.clientHeight;
        const contentHeight = contentRef.current.clientHeight;

        // Only scroll if content is taller than half the viewport
        if (contentHeight > containerHeight / 2) {
          // Scroll to put the bottom content at middle of viewport
          scrollAreaRef.current.scrollTop = contentHeight - containerHeight / 2;
        }
      }
    }, 100);
  };

  useEffect(() => {
    scrollToPosition();
  }, [conversation, showInput, isProcessingAnswer]);

  useEffect(() => {
    // Start the first question
    setTimeout(() => {
      setConversation([
        {
          id: "q-0",
          type: "question",
          content: questions[0].text,
          fieldName: questions[0].field as keyof UserProfile,
        },
      ]);
    }, 500);
  }, []);

  const handleBack = () => {
    if (currentStep === 0) return;

    // Find the last question's answer index
    const lastAnswerIndex = conversation.findIndex(
      (item) => item.id === `a-${currentStep - 1}`
    );

    // Remove everything after that answer
    const newConversation = conversation.slice(0, lastAnswerIndex + 1);
    setConversation(newConversation);

    // Go back one step
    const prevStep = currentStep - 1;
    setCurrentStep(prevStep);

    // Restore the previous value to the input
    const prevAnswer = conversation.find((item) => item.id === `a-${prevStep}`);
    const prevQuestion = questions[prevStep];

    if (prevQuestion.type === "text" || prevQuestion.type === "number") {
      setInputValue(prevAnswer?.value || "");
    } else if (prevQuestion.type === "name") {
      const names = prevAnswer?.value || { firstName: "", lastName: "" };
      setFirstNameValue(names.firstName);
      setLastNameValue(names.lastName);
    } else if (prevQuestion.type === "ethnicity") {
      setSelectedEthnicities(prevAnswer?.value || []);
    }

    // Add the question back and show input
    setTimeout(() => {
      setConversation([
        ...newConversation,
        {
          id: `q-${prevStep}`,
          type: "question",
          content: questions[prevStep].text,
          fieldName: questions[prevStep].field as keyof UserProfile,
        },
      ]);
      setShowInput(true);
    }, 100);
  };

  const proceedToNext = () => {
    // Move to next question or complete
    if (currentStep < questions.length - 1) {
      setTimeout(() => {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        const nextQuestion = questions[nextStep];

        // Get dynamic text if available, otherwise use static text
        const questionText = nextQuestion.getDynamicText
          ? nextQuestion.getDynamicText()
          : nextQuestion.text;

        setConversation((prev) => [
          ...prev,
          {
            id: `q-${nextStep}`,
            type: "question",
            content: questionText,
            fieldName: nextQuestion.field as keyof UserProfile,
          },
        ]);
        setIsProcessingAnswer(false);
      }, 500);
    } else {
      // Complete onboarding
      setIsProcessingAnswer(false);
      handleProfileSubmit();
    }
  };

  const handleSubmit = () => {
    const currentQuestion = questions[currentStep];

    if (
      !inputValue.trim() &&
      currentQuestion.type !== "ethnicity" &&
      currentQuestion.type !== "file" &&
      currentQuestion.type !== "name"
    )
      return;

    let answerText = inputValue;
    let value: any = inputValue;

    // Update profile based on field
    if (currentQuestion.field === "age") {
      const age = parseInt(inputValue);
      setProfile((prev) => ({ ...prev, age }));
      value = age;
    } else if (currentQuestion.field === "height") {
      const height = parseInt(inputValue);
      setProfile((prev) => ({ ...prev, height }));
      answerText = `${Math.floor(height / 12)}'${height % 12}"`;
      value = height;
    }

    // Add answer to conversation
    setConversation((prev) => [
      ...prev,
      {
        id: `a-${currentStep}`,
        type: "answer",
        content: answerText,
        value: value,
      },
    ]);

    // Clear input and hide temporarily, show processing
    setInputValue("");
    setShowInput(false);
    setIsProcessingAnswer(true);

    proceedToNext();
  };

  const handleNameSubmit = () => {
    if (!firstNameValue.trim() || !lastNameValue.trim()) return;

    setProfile((prev) => ({
      ...prev,
      firstName: firstNameValue,
      lastName: lastNameValue,
    }));

    // Add answer to conversation
    setConversation((prev) => [
      ...prev,
      {
        id: `a-${currentStep}`,
        type: "answer",
        content: `${firstNameValue} ${lastNameValue}`,
        value: { firstName: firstNameValue, lastName: lastNameValue },
      },
    ]);

    // Clear inputs and hide temporarily, show processing
    setFirstNameValue("");
    setLastNameValue("");
    setShowInput(false);
    setIsProcessingAnswer(true);

    proceedToNext();
  };

  const handleEthnicitySubmit = () => {
    if (selectedEthnicities.length === 0) return;

    setProfile((prev) => ({ ...prev, ethnicity: selectedEthnicities }));

    const selectedLabels = selectedEthnicities
      .map((eth) => ethnicities.find((e) => e.value === eth)?.label || eth)
      .join(", ");

    // Add answer to conversation
    setConversation((prev) => [
      ...prev,
      {
        id: `a-${currentStep}`,
        type: "answer",
        content: selectedLabels,
        value: selectedEthnicities,
      },
    ]);

    setSelectedEthnicities([]);
    setShowInput(false);
    setIsProcessingAnswer(true);

    proceedToNext();
  };

  const handleFileUpload = async (file: File, type: "headshot" | "resume") => {
    setLoading(type);
    setError(null);
    setShowInput(false);
    setIsProcessingAnswer(true);

    try {
      const uploadFunc = type === "headshot" ? uploadHeadshot : uploadResume;
      const result = await uploadFunc(file, auth.currentUser?.uid || "");

      if (!result.success) {
        setError("Upload failed");
        setIsProcessingAnswer(false);
        setShowInput(true);
        return;
      }

      // Add answer to conversation
      setConversation((prev) => [
        ...prev,
        {
          id: `a-${currentStep}`,
          type: "answer",
          content: `✅ ${file.name}`,
          value: file.name,
        },
      ]);

      proceedToNext();
    } catch {
      setError(`Failed to upload ${type}`);
      setIsProcessingAnswer(false);
      setShowInput(true);
    } finally {
      setLoading("idle");
    }
  };

  const handleSkip = () => {
    // Add skip answer
    setConversation((prev) => [
      ...prev,
      {
        id: `a-${currentStep}`,
        type: "answer",
        content: "Skipped",
        value: null,
      },
    ]);

    setShowInput(false);
    setIsProcessingAnswer(true);

    proceedToNext();
  };

  async function handleProfileSubmit() {
    setShowInput(false);

    // Add completion message
    setConversation((prev) => [
      ...prev,
      {
        id: "complete",
        type: "question",
        content: "Perfect! Setting up your profile now... 🎉",
      },
    ]);

    try {
      setLoading("profile");
      const res = await addUser(profile);
      if (res.success) {
        setTimeout(() => router.replace(finalDestination), 1500);
      } else {
        setError(res.error || "Failed to save profile");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save profile.");
      }
    } finally {
      setLoading("idle");
    }
  }

  const currentQuestion =
    currentStep < questions.length ? questions[currentStep] : null;

  // Displays progress of onboarding steps
  const ProgressBar = () => {
    const totalSteps = questions.length;
    const stepHeight = 32; // gap-8 = 2rem = 32px

    return (
      <div className="fixed left-[calc(40%-24rem)] top-1/2 -translate-y-1/2 z-20">
        <div className="relative">
          {/* Background line */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-2 w-0.5 bg-gray-300"
            style={{
              height: `${stepHeight * (totalSteps + 1)}px`,
            }}
          />

          {/* Progress line */}
          {currentStep > 0 && (
            <div
              className="absolute left-1/2 -translate-x-1/2 top-2 w-0.5 bg-primary-dark-alt transition-all duration-500"
              style={{
                height: `${stepHeight * currentStep + 32}px`,
              }}
            />
          )}

          {/* Step circles */}
          <div className="relative flex flex-col gap-8">
            {questions.map((_, index) => {
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;

              return (
                <div
                  key={index}
                  className="relative flex items-center justify-center"
                >
                  {/* Outer ring for current step */}
                  {isCurrent && (
                    <div className="absolute w-4 h-4 rounded-full border-[4px] border-primary-dark-alt" />
                  )}

                  {/* Inner circle */}
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary-dark-alt"
                        : isCurrent
                        ? "bg-white border-2 border-primary-dark-alt"
                        : "bg-white border-2 border-gray-300"
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen bg-primary-light-alt relative flex flex-col">
      {/* Logo */}
      <h3 className="text-logo-lg text-primary-dark z-100 absolute top-6 left-6">
        tableread
      </h3>

      <ProgressBar />

      {/* Gradient overlay at top - creates fade effect on scrolled content */}
      <div className="fixed top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#eeede4] via-[#eeede4]/80 to-transparent z-10 pointer-events-none" />

      {/* Scrollable area with flex layout */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto pt-25">
        <div className="max-w-2xl mx-auto px-6 min-h-full flex flex-col">
          {/* This flex spacer will center content when it's small */}
          <div className="flex-1 flex flex-col justify-center">
            <div ref={contentRef}>
              {/* Header as first message */}
              <div className="mb-8">
                <div className="text-header-3 text-primary-dark-alt mb-2">
                  Welcome! Let's get you set up.
                </div>
              </div>

              {/* All Conversation History */}
              <div className="">
                {conversation.map((item, index) => {
                  const isCurrentQuestion =
                    item.type === "question" &&
                    index === conversation.length - 1 &&
                    !isProcessingAnswer;

                  const isLatestAnswer =
                    item.type === "answer" && index === conversation.length - 1;

                  return (
                    <div
                      key={item.id}
                      className={
                        !isCurrentQuestion && !isLatestAnswer ? "" : ""
                      }
                    >
                      {item.type === "question" ? (
                        <div className="relative">
                          {/* Add the profile image for current question only */}
                          {isCurrentQuestion && (
                            <Image
                              src="/admin-profile-pic.png"
                              alt="Admin"
                              width={40}
                              height={40}
                              className="absolute -left-14 rounded-full object-cover"
                              priority={true}
                            />
                          )}
                          <div
                            className={`font-semibold text-primary-dark ${
                              !isCurrentQuestion ? "mb-1 opacity-50" : "mb-4"
                            }`}
                          >
                            {isCurrentQuestion ? (
                              // Current question with typewriter effect
                              <MultiLineTypewriter
                                lines={item.content.split("|")}
                                onComplete={() => {
                                  if (!showInput && !isProcessingAnswer) {
                                    setTimeout(() => setShowInput(true), 200);
                                  }
                                }}
                              />
                            ) : (
                              // Previous questions without animation
                              item.content.split("|").map((line, idx) => (
                                <div
                                  key={idx}
                                  className={idx > 0 ? "mt-0" : ""}
                                >
                                  {line}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-primary-dark font-semibold mb-8">
                          {item.content}
                        </div>
                      )}

                      {/* Show processing spinner after the current question when answer is being processed */}
                      {isCurrentQuestion && isProcessingAnswer && (
                        <div className="flex items-center py-4 animate-fadeIn">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        </div>
                      )}

                      {/* Current Input Area - only show for current question */}
                      {isCurrentQuestion && showInput && currentQuestion && (
                        <div className="animate-fadeIn">
                          {error && (
                            <div className="mb-3 p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                              {error}
                            </div>
                          )}

                          {currentQuestion.type === "name" ? (
                            <div>
                              <div className="flex gap-3 mb-2">
                                <input
                                  type="text"
                                  value={firstNameValue}
                                  onChange={(e) =>
                                    setFirstNameValue(e.target.value)
                                  }
                                  onKeyUp={(e) =>
                                    e.key === "Enter" &&
                                    lastNameValue.trim() &&
                                    handleNameSubmit()
                                  }
                                  placeholder="First name"
                                  className="w-[35%] px-4 py-3 rounded-lg focus:outline-none bg-white text-primary-dark"
                                  autoFocus
                                />
                                <input
                                  type="text"
                                  value={lastNameValue}
                                  onChange={(e) =>
                                    setLastNameValue(e.target.value)
                                  }
                                  onKeyUp={(e) =>
                                    e.key === "Enter" &&
                                    firstNameValue.trim() &&
                                    handleNameSubmit()
                                  }
                                  placeholder="Last name"
                                  className="w-[35%] px-4 py-3 rounded-lg focus:outline-none bg-white text-primary-dark"
                                />
                                <button
                                  onClick={handleNameSubmit}
                                  disabled={
                                    !firstNameValue.trim() ||
                                    !lastNameValue.trim()
                                  }
                                  className="px-6 py-3 bg-primary-dark-alt text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowRight className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ) : currentQuestion.type === "text" ? (
                            <div className="flex gap-2">
                              {currentStep > 0 && (
                                <button
                                  onClick={handleBack}
                                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                              )}
                              <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyUp={(e) =>
                                  e.key === "Enter" && handleSubmit()
                                }
                                placeholder={`Enter here`}
                                className="w-1/2 px-4 py-3 rounded-lg focus:outline-none bg-white text-primary-dark"
                                autoFocus
                              />
                              <button
                                onClick={handleSubmit}
                                disabled={!inputValue.trim()}
                                className="px-6 py-3 bg-primary-dark-alt text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowRight className="w-5 h-5" />
                              </button>
                            </div>
                          ) : currentQuestion.type === "number" ? (
                            <div className="flex gap-2">
                              {currentStep > 0 && (
                                <button
                                  onClick={handleBack}
                                  className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                                </button>
                              )}
                              <input
                                type="number"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyUp={(e) =>
                                  e.key === "Enter" && handleSubmit()
                                }
                                placeholder={
                                  currentQuestion.field === "height"
                                    ? "e.g., 66"
                                    : "Enter age"
                                }
                                className="px-4 py-3 rounded-lg focus:outline-none bg-white text-primary-dark"
                                autoFocus
                              />
                              <button
                                onClick={handleSubmit}
                                disabled={!inputValue.trim()}
                                className="px-6 py-3 bg-primary-dark-alt text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowRight className="w-5 h-5" />
                              </button>
                            </div>
                          ) : currentQuestion.type === "ethnicity" ? (
                            <div>
                              <div className="grid grid-cols-3 gap-2 mb-4">
                                {ethnicities.map((eth) => (
                                  <button
                                    key={eth.value}
                                    onClick={() => {
                                      setSelectedEthnicities((prev) =>
                                        prev.includes(eth.value)
                                          ? prev.filter((e) => e !== eth.value)
                                          : [...prev, eth.value]
                                      );
                                    }}
                                    className={`p-3 rounded-lg border-2 text-sm transition-all ${
                                      selectedEthnicities.includes(eth.value)
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 hover:border-gray-300 bg-white"
                                    }`}
                                  >
                                    <div className="text-xl mb-1">
                                      {eth.emoji}
                                    </div>
                                    <div className="text-xs text-primary-dark font-semibold">
                                      {eth.label}
                                    </div>
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                {currentStep > 0 && (
                                  <button
                                    onClick={handleBack}
                                    className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                  >
                                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                                  </button>
                                )}
                                <button
                                  onClick={handleEthnicitySubmit}
                                  disabled={selectedEthnicities.length === 0}
                                  className="flex-1 flex items-center justify-center px-6 py-3 bg-primary-dark-alt text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <ArrowRight className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ) : currentQuestion.type === "file" ? (
                            <div>
                              {loading === currentQuestion.field ? (
                                <div className="flex items-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                                  <span className="text-primary-dark font-semibold">
                                    Uploading...
                                  </span>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <label className="block">
                                    <div className="flex items-center justify-center w-full py-8 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 bg-white/50">
                                      <Upload className="w-8 h-8 text-gray-400 mr-3" />
                                      <span className="text-primary-dark font-semibold">
                                        Click to upload or drag and drop
                                      </span>
                                    </div>
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept={
                                        currentQuestion.field === "headshot"
                                          ? "image/*"
                                          : ".pdf,.docx"
                                      }
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleFileUpload(
                                            file,
                                            currentQuestion.field as
                                              | "headshot"
                                              | "resume"
                                          );
                                        }
                                      }}
                                    />
                                  </label>
                                  <div className="flex gap-2">
                                    {currentStep > 0 && (
                                      <button
                                        onClick={handleBack}
                                        className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                      >
                                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                                      </button>
                                    )}
                                    <button
                                      onClick={handleSkip}
                                      className="flex-1 px-6 py-3 bg-primary-dark-alt text-white font-semibold rounded-lg hover:opacity-80 transition-colors"
                                    >
                                      Skip for now
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  );
                })}

                {loading === "profile" && (
                  <div className="flex items-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-primary-dark font-semibold">
                      Creating your profile...
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom spacer that only appears when content grows */}
          <div className="h-[50vh] flex-shrink-0"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function ChatOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-primary-light-alt flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <ChatOnboardingContent />
    </Suspense>
  );
}
