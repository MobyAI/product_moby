import { useEffect, useRef, useState, useCallback } from "react";
import { X } from "lucide-react";

interface EditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newValue: string) => void | Promise<void>;
  title: string;
  initialValue: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  showCloseButton?: boolean;
}

export default function EditDialog({
  isOpen,
  onClose,
  onSave,
  title,
  initialValue,
  placeholder = "Enter name...",
  confirmText = "Save",
  cancelText = "Cancel",
  isLoading = false,
  showCloseButton = true,
}: EditDialogProps) {
  const [value, setValue] = useState(initialValue);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset value when dialog opens with new initialValue
  useEffect(() => {
    if (isOpen) {
      setValue(initialValue);
    }
  }, [isOpen, initialValue]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!value.trim()) return;
    await onSave(value.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading && value.trim()) {
      handleSave();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, isLoading, onClose]);

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
    return () => document.removeEventListener("keydown", trap);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/70 transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Dialog panel */}
      <div
        ref={dialogRef}
        className="relative z-10 transform overflow-hidden rounded-xl bg-primary-light-alt py-4 px-4 text-left max-w-md w-full transition-all animate-fadeIn"
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
        <div className="relative px-4 pb-4 pt-5">
          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3
                id="dialog-title"
                className="text-xl font-semibold leading-6 text-primary-dark"
              >
                {title}
              </h3>
              <div className="mt-4">
                <input
                  ref={inputRef}
                  id="edit-input"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  disabled={isLoading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="relative flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isLoading || !value.trim()}
            className="inline-flex justify-center rounded-lg px-4 py-2.5 text-sm font-medium shadow-sm bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            onClick={handleSave}
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
                Saving...
              </div>
            ) : (
              confirmText
            )}
          </button>

          <button
            type="button"
            disabled={isLoading}
            className="inline-flex justify-center rounded-lg bg-white/50 px-4 py-2.5 text-sm font-medium text-primary-dark shadow-sm hover:bg-white/20 hover:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition-colors"
            onClick={onClose}
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------
   Hook API
----------------- */
interface EditDialogState {
  isOpen: boolean;
  title: string;
  label?: string;
  initialValue: string;
  placeholder?: string;
  onSave?: (newValue: string) => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
}

export function useEditDialog() {
  const [dialogState, setDialogState] = useState<EditDialogState>({
    isOpen: false,
    title: "",
    initialValue: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const openEditDialog = useCallback(
    (options: Omit<EditDialogState, "isOpen">) => {
      setDialogState({
        ...options,
        isOpen: true,
      });
    },
    []
  );

  const closeEditDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    setIsLoading(false);
  }, []);

  const handleSave = useCallback(
    async (newValue: string) => {
      if (dialogState.onSave) {
        setIsLoading(true);
        try {
          await dialogState.onSave(newValue);
          closeEditDialog();
        } catch (error) {
          console.error("Edit dialog save error:", error);
          setIsLoading(false);
        }
      } else {
        closeEditDialog();
      }
    },
    [dialogState.onSave, closeEditDialog]
  );

  return {
    editDialogProps: {
      ...dialogState,
      isLoading,
      onClose: closeEditDialog,
      onSave: handleSave,
    },
    openEditDialog,
    closeEditDialog,
  };
}
