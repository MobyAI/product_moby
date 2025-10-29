import React, { useEffect, useRef, ReactNode } from "react";

interface InteractiveBackgroundWrapperProps {
  children: ReactNode;
  sandColor?: string;
  baseColor?: string;
  className?: string;
}

export default function InteractiveBackgroundWrapper({
  children,
  sandColor = "#686d7f",
  baseColor = "#363c54",
  className = "",
}: InteractiveBackgroundWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseDownRef = useRef<boolean>(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const resizeCanvas = () => {
      const oldCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;

      // Fill with sand color initially
      ctx.fillStyle = sandColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Displacement function - "erase" the sand to reveal dark background
    const displaceSand = (x: number, y: number) => {
      const brushSize = 40; // Size of the displacement area

      // Create a radial gradient that goes from base color to transparent
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, brushSize);
      gradient.addColorStop(0, baseColor); // Center is dark navy
      gradient.addColorStop(0.7, baseColor); // Most of it is dark navy
      gradient.addColorStop(1, sandColor); // Edge blends with sand

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const currentPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      // Always displace when mouse is moving (no need to click)
      if (lastPositionRef.current) {
        // Interpolate between last and current position for smooth displacement
        const dx = currentPos.x - lastPositionRef.current.x;
        const dy = currentPos.y - lastPositionRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(Math.floor(distance / 5), 1);

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const interpX = lastPositionRef.current.x + dx * t;
          const interpY = lastPositionRef.current.y + dy * t;
          displaceSand(interpX, interpY);
        }
      } else {
        displaceSand(currentPos.x, currentPos.y);
      }

      lastPositionRef.current = currentPos;
    };

    const handleMouseLeave = () => {
      lastPositionRef.current = null;
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [baseColor, sandColor]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full min-h-screen ${className}`}
      style={{ backgroundColor: baseColor }}
    >
      {/* Interactive canvas layer - the "sand" */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />

      {/* Your landing page content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
