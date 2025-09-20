"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import ReactDOM from "react-dom";
import { X, Check, AlertTriangle } from "lucide-react";

export type ToastType = "success" | "danger" | "warning" | "neutral";

export interface ShowToastOptions {
    header: string;
    line1?: string;
    line2?: string;
    type?: ToastType;
    duration?: number;
}

type ToastContextValue = {
    showToast: (opts: ShowToastOptions) => void;
    closeToast: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
    return ctx;
}

type ToastState = (ShowToastOptions & { id: number }) | null;

function toneClasses(type: ToastType) {
    switch (type) {
        case "success":
            return {
                bg: "bg-green-500/20",
                border: "border-green-500/50",
                icon: "bg-green-500 text-white",
                text: "text-white",
                aria: "polite" as const,
            };
        case "danger":
            return {
                bg: "bg-red-500/20",
                border: "border-red-500/50",
                icon: "bg-red-500 text-white",
                text: "text-white",
                aria: "assertive" as const,
            };
        case "warning":
            return {
                bg: "bg-yellow-500/20",
                border: "border-yellow-500/50",
                icon: "bg-yellow-500 text-white",
                text: "text-white",
                aria: "assertive" as const,
            };
        default:
            return {
                bg: "bg-zinc-500/20",
                border: "border-zinc-500/50",
                icon: "bg-zinc-500 text-white",
                text: "text-white",
                aria: "polite" as const,
            };
    }
}

function getIcon(type: ToastType) {
    switch (type) {
        case "success":
            return <Check className="h-5 w-5" />;
        case "danger":
            return <X className="h-5 w-5" />;
        case "warning":
            return <AlertTriangle className="h-5 w-5" />;
        default:
            return <Check className="h-5 w-5" />;
    }
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const [toast, setToast] = useState<ToastState>(null);
    const [visible, setVisible] = useState(false);

    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const removeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => setMounted(true), []);

    const clearTimers = () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
        if (removeTimer.current) clearTimeout(removeTimer.current);
        hideTimer.current = null;
        removeTimer.current = null;
    };

    const closeToast = useCallback(() => {
        setVisible(false);
        removeTimer.current = setTimeout(() => setToast(null), 220); // match transition
    }, []);

    const showToast = useCallback((opts: ShowToastOptions) => {
        clearTimers();
        const withDefaults: ToastState = {
            id: Date.now(),
            duration: opts.duration ?? 3000,
            type: opts.type ?? "neutral",
            header: opts.header,
            line1: opts.line1,
            line2: opts.line2,
        };
        setToast(withDefaults);
        setVisible(true);
        hideTimer.current = setTimeout(() => closeToast(), withDefaults.duration);
    }, [closeToast]);

    useEffect(() => () => clearTimers(), []);

    const value = useMemo(() => ({ showToast, closeToast }), [showToast, closeToast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Portal to body for overlay positioning */}
            {mounted && ReactDOM.createPortal(
                <ToastViewport toast={toast} visible={visible} onClose={closeToast} />,
                document.body
            )}
        </ToastContext.Provider>
    );
}

function ToastViewport({
    toast,
    visible,
    onClose,
}: {
    toast: ToastState;
    visible: boolean;
    onClose: () => void;
}) {
    if (!toast) return null;

    const tone = toneClasses(toast.type ?? "neutral");
    const icon = getIcon(toast.type ?? "neutral");

    return (
        <div
            className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-end p-4 mt-2 sm:p-8"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <div
                role="alert"
                aria-live={tone.aria}
                className={[
                    "pointer-events-auto relative flex items-center overflow-hidden rounded-2xl shadow-2xl backdrop-blur-md",
                    "transition-all duration-200 border",
                    tone.bg,
                    tone.border,
                    tone.text,
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
            >
                {/* Icon circle */}
                <div className="flex-shrink-0 ml-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tone.icon}`}>
                        {icon}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 px-4 py-4 mr-10">
                    <div className="text-lg font-bold tracking-tight whitespace-nowrap">{toast.header}</div>
                    {toast.line1 && (
                        <div className="mt-0.5 text-sm font-bold whitespace-nowrap">{toast.line1}</div>
                    )}
                    {toast.line2 && (
                        <div className="mt-0.5 text-sm font-bold whitespace-nowrap">{toast.line2}</div>
                    )}
                </div>

                {/* Close button */}
                <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-full focus:outline-none hover:bg-white/10 focus:ring-2 focus:ring-white/50 transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}