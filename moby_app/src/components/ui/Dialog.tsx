import { Fragment, useState, useCallback } from 'react';
import { Dialog as HeadlessDialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import {
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trash2,
    X
} from 'lucide-react';

// Add this style tag to your global CSS or use a CSS-in-JS solution
// For the radial gradient effect, you may need to add this to your global styles:
/*
.bg-gradient-radial {
    background: radial-gradient(circle at center, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
}
*/

export type DialogType = 'confirm' | 'alert' | 'success' | 'error' | 'warning' | 'info' | 'delete';

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
        iconBg: 'bg-gray-800',
        iconColor: 'text-gray-400',
        confirmBtnClass: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white',
        defaultConfirmText: 'Confirm'
    },
    delete: {
        icon: Trash2,
        iconBg: 'bg-red-950/30',
        iconColor: 'text-red-400',
        confirmBtnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
        defaultConfirmText: 'Delete'
    },
    alert: {
        icon: AlertCircle,
        iconBg: 'bg-gray-800',
        iconColor: 'text-gray-400',
        confirmBtnClass: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white',
        defaultConfirmText: 'OK'
    },
    success: {
        icon: CheckCircle,
        iconBg: 'bg-green-950/30',
        iconColor: 'text-green-400',
        confirmBtnClass: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white',
        defaultConfirmText: 'Got it, thanks!'
    },
    error: {
        icon: XCircle,
        iconBg: 'bg-red-950/30',
        iconColor: 'text-red-400',
        confirmBtnClass: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white',
        defaultConfirmText: 'OK'
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-yellow-950/30',
        iconColor: 'text-yellow-400',
        confirmBtnClass: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white',
        defaultConfirmText: 'OK'
    },
    info: {
        icon: Info,
        iconBg: 'bg-blue-950/30',
        iconColor: 'text-blue-400',
        confirmBtnClass: 'bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-white',
        defaultConfirmText: 'OK'
    }
};

export default function Dialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'confirm',
    confirmText,
    cancelText = 'Cancel',
    isLoading = false,
    showCloseButton = true
}: DialogProps) {
    const config = dialogConfig[type];
    const Icon = config.icon;

    // For alert-style dialogs (no onConfirm), use onClose as the primary action
    const isAlertStyle = !onConfirm;
    const handlePrimaryAction = async () => {
        if (isAlertStyle) {
            onClose();
        } else {
            await onConfirm?.();
        }
    };

    // Determine the actual button text
    const primaryButtonText = confirmText || config.defaultConfirmText;

    return (
        <Transition show={isOpen} as={Fragment}>
            <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/80 transition-opacity" />
                </TransitionChild>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <DialogPanel className="relative transform overflow-hidden p-3 rounded-xl bg-[#141414] text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Radial gradient overlay for subtle white glow inside the dialog */}
                                <div className="absolute inset-0 pointer-events-none rounded-xl" style={{ background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.03) 0%, transparent 70%)' }} />
                                {/* Close button (X) in top right corner */}
                                {showCloseButton && (
                                    <div className="absolute right-0 top-0 pr-4 pt-4 z-10">
                                        <button
                                            type="button"
                                            className="rounded-md bg-transparent text-gray-500 hover:text-gray-400 focus:outline-none transition-colors"
                                            onClick={onClose}
                                            disabled={isLoading}
                                        >
                                            <span className="sr-only">Close</span>
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                )}

                                <div className="relative px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        {/* Hide icon for cleaner look */}
                                        <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                                            <DialogTitle as="h3" className="text-lg font-medium leading-6 text-white">
                                                {title}
                                            </DialogTitle>
                                            <div className="mt-3">
                                                <p className="text-sm text-gray-400 whitespace-pre-wrap">
                                                    {message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative py-4 sm:flex sm:px-6 space-x-2">
                                    {/* Primary action button */}
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        className={`inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm ${config.confirmBtnClass} sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 transition-colors`}
                                        onClick={handlePrimaryAction}
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center">
                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </div>
                                        ) : (
                                            primaryButtonText
                                        )}
                                    </button>

                                    {/* Cancel button - only show for confirm-style dialogs */}
                                    {!isAlertStyle && (
                                        <button
                                            type="button"
                                            disabled={isLoading}
                                            className="mt-3 inline-flex w-full justify-center rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-gray-300 shadow-sm hover:bg-white/20 hover:text-white sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition-colors"
                                            onClick={onClose}
                                        >
                                            {cancelText}
                                        </button>
                                    )}
                                </div>
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition>
    );
}

// Hook for easier usage
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
        type: 'confirm',
        title: '',
        message: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const openDialog = useCallback((options: Omit<DialogState, 'isOpen'>) => {
        setDialogState({
            ...options,
            isOpen: true
        });
    }, []);

    const openConfirm = useCallback((
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
            type: options?.type || 'confirm',
            title,
            message,
            onConfirm,
            confirmText: options?.confirmText,
            cancelText: options?.cancelText
        });
    }, [openDialog]);

    const openAlert = useCallback((
        title: string,
        message: string,
        type: DialogType = 'alert'
    ) => {
        openDialog({
            type,
            title,
            message
        });
    }, [openDialog]);

    const closeDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, isOpen: false }));
        setIsLoading(false);
    }, []);

    const handleConfirm = useCallback(async () => {
        if (dialogState.onConfirm) {
            setIsLoading(true);
            try {
                await dialogState.onConfirm();
                closeDialog();
            } catch (error) {
                console.error('Dialog action error:', error);
                setIsLoading(false);
                // Optionally show error state
            }
        } else {
            closeDialog();
        }
    }, [dialogState.onConfirm, closeDialog]);

    return {
        dialogProps: {
            ...dialogState,
            isLoading,
            onClose: closeDialog,
            onConfirm: dialogState.onConfirm ? handleConfirm : undefined
        },
        openDialog,
        openConfirm,
        openAlert,
        closeDialog
    };
}