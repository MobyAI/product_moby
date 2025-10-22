import React from "react";
import { cn } from "@/lib/utils";

interface PulsatingDivProps extends React.HTMLAttributes<HTMLDivElement> {
  pulseColor?: string;
  duration?: string;
}

export const PulsatingDiv = React.forwardRef<HTMLDivElement, PulsatingDivProps>(
  (
    {
      className,
      children,
      pulseColor = "#f5d76e", // optional default
      duration = "1.5s",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-primary text-primary-foreground relative flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-center",
          className
        )}
        style={
          {
            "--pulse-color": pulseColor,
            "--duration": duration,
          } as React.CSSProperties
        }
        {...props}
      >
        <div className="relative z-10">{children}</div>
        <div className="absolute top-1/2 left-1/2 size-full -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-lg bg-inherit" />
      </div>
    );
  }
);

PulsatingDiv.displayName = "PulsatingDiv";
