import { ReactNode } from "react";

interface LayoutProps {
    children: ReactNode
    title?: string
    action?: ReactNode
    maxWidth?: number
}

export function DashboardLayout({ children, title, action, maxWidth }: LayoutProps) {
    return (
        <div className="h-full">
            {title && (
                <div className="bg-white shadow-sm">
                    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-black">{title}</h1>
                        {action}
                    </div>
                </div>
            )}
            <div
                className="py-8 mx-auto"
                style={maxWidth ? { maxWidth: `${maxWidth}%` } : undefined}
            >
                {children}
            </div>
        </div>
    )
}