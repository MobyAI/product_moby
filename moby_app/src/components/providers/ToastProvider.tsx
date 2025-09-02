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
import { X } from "lucide-react";

export type ToastType = "success" | "danger" | "warning" | "neutral";

export interface ShowToastOptions {
    header: string;
    line1?: string;
    line2?: string;
    type?: ToastType;
    /** ms; default 3500 */
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
                box: "bg-emerald-600/90 text-white ring-emerald-400/40",
                bar: "bg-emerald-300",
                aria: "polite" as const,
            };
        case "danger":
            return {
                box: "bg-rose-600/90 text-white ring-rose-400/40",
                bar: "bg-rose-300",
                aria: "assertive" as const,
            };
        case "warning":
            return {
                box: "bg-amber-400/95 text-black ring-amber-500/40",
                bar: "bg-amber-300",
                aria: "assertive" as const,
            };
        default:
            return {
                box: "bg-zinc-900/90 text-white ring-zinc-500/40",
                bar: "bg-zinc-300",
                aria: "polite" as const,
            };
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
            duration: opts.duration ?? 3500,
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

    return (
        <div
            className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-end p-4 sm:p-8"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
            <div
                role="alert"
                aria-live={tone.aria}
                className={[
                    "pointer-events-auto relative flex w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl backdrop-blur",
                    "transition-all duration-200",
                    "bg-white",
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
                ].join(" ")}
            >
                {/* Left accent bar (now inside flex, clipped by rounded corners) */}
                <span className={`w-2.5 ${tone.bar}`} />

                {/* Content */}
                <div className="flex-1 px-4 py-3 pr-10">
                    <div className="text-md font-semibold tracking-tight">{toast.header}</div>
                    {toast.line1 && (
                        <div className="mt-0.5 text-sm">{toast.line1}</div>
                    )}
                    {toast.line2 && (
                        <div className="mt-0.5 text-sm">{toast.line2}</div>
                    )}
                </div>

                {/* Close button */}
                <button
                    type="button"
                    aria-label="Close"
                    onClick={onClose}
                    className="absolute right-2.5 top-2.5 inline-flex h-8 w-8 items-center justify-center rounded-full focus:outline-none hover:opacity-90 focus:ring-2 focus:ring-white/50"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}