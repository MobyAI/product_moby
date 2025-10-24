import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
  X,
} from "lucide-react";

export type DialogType =
  | "confirm"
  | "alert"
  | "success"
  | "error"
  | "warning"
  | "info"
  | "delete";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void | Promise<void>;
  title: string;
  message: string;
  type?: DialogType;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  showCloseButton?: boolean;
}

const dialogConfig = {
  confirm: {
    icon: AlertCircle,
    confirmBtnClass:
      "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white",
    defaultConfirmText: "Confirm",
  },
  delete: {
    icon: Trash2,
    confirmBtnClass:
      "bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white",
    defaultConfirmText: "Delete",
  },
  alert: {
    icon: AlertCircle,
    confirmBtnClass:
      "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white",
    defaultConfirmText: "Got it, thanks!",
  },
  success: {
    icon: CheckCircle,
    confirmBtnClass:
      "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white",
    defaultConfirmText: "Got it, thanks!",
  },
  error: {
    icon: XCircle,
    confirmBtnClass:
      "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white",
    defaultConfirmText: "Got it, thanks!",
  },
  warning: {
    icon: AlertTriangle,
    confirmBtnClass:
      "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white",
    defaultConfirmText: "Got it, thanks!",
  },
  info: {
    icon: Info,
    confirmBtnClass:
      "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white",
    defaultConfirmText: "Got it, thanks!",
  },
};

export default function Dialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "confirm",
  confirmText,
  cancelText = "Cancel",
  isLoading = false,
  showCloseButton = true,
}: DialogProps) {
  const config = dialogConfig[type];
  // const Icon = config.icon;

  const dialogRef = useRef<HTMLDivElement>(null);

  const isAlertStyle = !onConfirm;
  const handlePrimaryAction = async () => {
    if (isAlertStyle) {
      onClose();
    } else {
      await onConfirm?.();
    }
  };

  const primaryButtonText = confirmText || config.defaultConfirmText;

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Trap focus inside dialog
  useEffect(() => {
    if (!isOpen) return;
    const focusable = dialogRef.current?.querySelectorAll<
      HTMLButtonElement | HTMLInputElement
    >(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable?.[0];
    const last = focusable?.[focusable.length - 1];

    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !focusable || focusable.length === 0) return;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          (last as HTMLElement)?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          (first as HTMLElement)?.focus();
        }
      }
    };

    document.addEventListener("keydown", trap);
    (first as HTMLElement)?.focus();
    return () => document.removeEventListener("keydown", trap);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      aria-describedby="dialog-message"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className="relative z-10 transform overflow-hidden rounded-xl bg-primary-light-alt p-6 text-left max-w-md transition-all animate-fadeIn"
      >
        {/* Close button */}
        {showCloseButton && (
          <div className="absolute right-5 top-5 z-10">
            <button
              type="button"
              className="rounded-md bg-transparent text-gray-500 hover:text-gray-400 hover:cursor-pointer focus:outline-none transition-colors"
              onClick={onClose}
              disabled={isLoading}
            >
              <span className="sr-only">Close</span>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="relative">
          <div className="flex items-start">
            <div className="text-left w-full">
              <h3
                id="dialog-title"
                className="text-header-3 text-primary-dark"
              >
                {title}
              </h3>
              <div className="mt-2 mb-4">
                <p
                  id="dialog-message"
                  className="text-md text-primary-dark"
                >
                  {message}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="relative flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            className={`inline-flex justify-center rounded-lg bg-primary-dark border border-primary-dark text-white hover:cursor-pointer hover:opacity-90 px-8 py-2.5 text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`}
            onClick={handlePrimaryAction}
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </div>
            ) : (
              primaryButtonText
            )}
          </button>

          {!isAlertStyle && (
            <button
              type="button"
              disabled={isLoading}
              className="inline-flex justify-center rounded-lg px-8 py-2.5 text-sm text-primary-dark border border-primary-dark shadow-sm hover:opacity-80 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition-colors"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------
   Hook API
----------------- */
interface DialogState {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
}

export function useDialog() {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: "confirm",
    title: "",
    message: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const openDialog = useCallback((options: Omit<DialogState, "isOpen">) => {
    setDialogState({
      ...options,
      isOpen: true,
    });
  }, []);

  const openConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void | Promise<void>,
      options?: {
        type?: DialogType;
        confirmText?: string;
        cancelText?: string;
      }
    ) => {
      openDialog({
        type: options?.type || "confirm",
        title,
        message,
        onConfirm,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
      });
    },
    [openDialog]
  );

  const openAlert = useCallback(
    (title: string, message: string, type: DialogType = "alert") => {
      openDialog({
        type,
        title,
        message,
      });
    },
    [openDialog]
  );

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    setIsLoading(false);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (dialogState.onConfirm) {
      setIsLoading(true);
      try {
        await dialogState.onConfirm();
        closeDialog();
      } catch (error) {
        console.error("Dialog action error:", error);
        setIsLoading(false);
      }
    } else {
      closeDialog();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogState.onConfirm, closeDialog]);

  return {
    dialogProps: {
      ...dialogState,
      isLoading,
      onClose: closeDialog,
      onConfirm: dialogState.onConfirm ? handleConfirm : undefined,
    },
    openDialog,
    openConfirm,
    openAlert,
    closeDialog,
  };
}
