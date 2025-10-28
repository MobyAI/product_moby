import { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
  maxWidth?: number;
}

export function DashboardLayout({ children, maxWidth }: LayoutProps) {
  return (
    <div
      className="pt-4 mx-auto flex flex-col flex-1 h-full"
      style={maxWidth ? { maxWidth: `${maxWidth}%` } : undefined}
    >
      {children}
    </div>
  );
}
