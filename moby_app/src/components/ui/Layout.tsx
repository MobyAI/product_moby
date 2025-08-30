import { ReactNode } from 'react';

interface LayoutProps {
    children: ReactNode
    title?: string
    action?: ReactNode
}

export function Layout({ children, title, action }: LayoutProps) {
    return (
        <div className="min-h-screen">
            {title && (
                <div className="bg-white shadow-sm">
                    <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
                        <h1 className="text-xl font-semibold text-black">{title}</h1>
                        {action}
                    </div>
                </div>
            )}
            {children}
        </div>
    )
}
