import { Fragment, useState, useCallback } from 'react';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';
import {
    AlertTriangle,
    Info,
    CheckCircle,
    XCircle,
    AlertCircle,
    Trash2,
    X
} from 'lucide-react';

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
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        defaultConfirmText: 'Confirm'
    },
    delete: {
        icon: Trash2,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        confirmBtnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        defaultConfirmText: 'Delete'
    },
    alert: {
        icon: AlertCircle,
        iconBg: 'bg-gray-100',
        iconColor: 'text-gray-600',
        confirmBtnClass: 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500',
        defaultConfirmText: 'OK'
    },
    success: {
        icon: CheckCircle,
        iconBg: 'bg-green-100',
        iconColor: 'text-green-600',
        confirmBtnClass: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
        defaultConfirmText: 'OK'
    },
    error: {
        icon: XCircle,
        iconBg: 'bg-red-100',
        iconColor: 'text-red-600',
        confirmBtnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        defaultConfirmText: 'OK'
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-yellow-100',
        iconColor: 'text-yellow-600',
        confirmBtnClass: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
        defaultConfirmText: 'OK'
    },
    info: {
        icon: Info,
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600',
        confirmBtnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
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
        <Transition.Root show={isOpen} as={Fragment}>
            <HeadlessDialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
                </Transition.Child>

                <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
                    <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            <HeadlessDialog.Panel className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                {/* Close button (X) in top right corner */}
                                {showCloseButton && (
                                    <div className="absolute right-0 top-0 pr-4 pt-4">
                                        <button
                                            type="button"
                                            className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                            onClick={onClose}
                                            disabled={isLoading}
                                        >
                                            <span className="sr-only">Close</span>
                                            <X className="h-5 w-5" aria-hidden="true" />
                                        </button>
                                    </div>
                                )}

                                <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full ${config.iconBg} sm:mx-0 sm:h-10 sm:w-10`}>
                                            <Icon className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
                                        </div>
                                        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                                            <HeadlessDialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900">
                                                {title}
                                            </HeadlessDialog.Title>
                                            <div className="mt-2">
                                                <p className="text-sm text-gray-500 whitespace-pre-wrap">
                                                    {message}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                                    {/* Primary action button */}
                                    <button
                                        type="button"
                                        disabled={isLoading}
                                        className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm ${config.confirmBtnClass} sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
                                            className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            onClick={onClose}
                                        >
                                            {cancelText}
                                        </button>
                                    )}
                                </div>
                            </HeadlessDialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </HeadlessDialog>
        </Transition.Root>
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