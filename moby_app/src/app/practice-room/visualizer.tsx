import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
    /** The AudioContext from your STT setup */
    audioContext: AudioContext | null;
    /** The source node (MediaStreamSource) from your STT setup */
    sourceNode: MediaStreamAudioSourceNode | null;
    /** Whether recording/STT is active */
    isActive: boolean;
    /** Diameter of the circular canvas in pixels */
    size?: number;
    /** Maximum extension of bars as percentage of radius (0.0 to 1.0) */
    maxBarExtension?: number;
    /** Background color of the canvas */
    backgroundColor?: string;
    /** Optional className for styling */
    className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    audioContext,
    sourceNode,
    isActive = false,
    size = 120, // ADJUSTABLE: Circle diameter in pixels
    maxBarExtension = 1.0, // ADJUSTABLE: Max bar height as percentage of radius
    backgroundColor = 'rgba(0, 0, 0, 0.3)',
    className = ''
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationIdRef = useRef<number | null>(null);
    const bufferLengthRef = useRef<number>(0);

    // Smoothing for dots animation
    const smoothedValuesRef = useRef<number[]>([0, 0, 0]);

    // Setup audio analyser
    useEffect(() => {
        if (!audioContext || !sourceNode) {
            if (analyserRef.current) {
                analyserRef.current = null;
                bufferLengthRef.current = 0;
            }
            return;
        }

        // Setup audio analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyser.minDecibels = -90;
        analyser.maxDecibels = -10;

        // Store analyser reference
        analyserRef.current = analyser;

        // Store buffer length instead of the array itself
        bufferLengthRef.current = analyser.frequencyBinCount;

        // Connect source to analyser (doesn't interfere with other connections)
        try {
            sourceNode.connect(analyser);
        } catch (error) {
            console.error('Failed to connect audio nodes for visualizer:', error);
        }

        return () => {
            // Cleanup
            if (analyserRef.current && sourceNode) {
                try {
                    sourceNode.disconnect(analyserRef.current);
                } catch (error) {
                    console.debug('Analyser already disconnected:', error);
                }
                analyserRef.current = null;
                bufferLengthRef.current = 0;
            }
        };
    }, [audioContext, sourceNode]);

    // Visualization rendering
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = size;
        canvas.height = size;

        // Calculate scaling factors based on circle size
        const radius = size / 2;
        const centerX = radius;
        const centerY = radius;

        // ADJUSTABLE: Scale factors that control dot and bar sizing relative to circle
        const dotRadiusScale = 0.06; // Dot radius as percentage of circle diameter
        const barWidthScale = 0.1; // Bar width as percentage of circle diameter  
        const dotGapScale = 0.167; // Gap between dots as percentage of circle diameter

        // Calculate actual sizes based on circle size
        const minDotRadius = size * dotRadiusScale; // Scales with circle size
        const barWidth = size * barWidthScale; // Scales with circle size
        const fixedGap = size * dotGapScale; // Scales with circle size

        const drawDots = (ctx: CanvasRenderingContext2D): void => {
            if (!analyserRef.current || bufferLengthRef.current === 0) return;

            // Create a fresh array each time
            const dataArray = new Uint8Array(bufferLengthRef.current);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Clear canvas and draw circular background
            ctx.clearRect(0, 0, size, size);

            // Draw circular background
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.fillStyle = backgroundColor;
            ctx.fill();

            // Calculate positions for 3 dots - centered in the circle
            const dotCount = 3;
            const totalWidth = (dotCount - 1) * fixedGap;
            const startX = centerX - totalWidth / 2; // Center horizontally in circle

            // With 16kHz sample rate and FFT size of 256:
            // Each bin = 16000 / 256 = 62.5 Hz
            const dotValues = [
                // Dot 1: Mid frequencies (300-1500 Hz) - main voice energy
                (() => {
                    const startBin = Math.floor(300 / 62.5);
                    const endBin = Math.floor(1500 / 62.5);
                    let sum = 0;
                    let peakValue = 0;
                    for (let j = startBin; j < endBin && j < dataArray.length; j++) {
                        sum += dataArray[j];
                        peakValue = Math.max(peakValue, dataArray[j]);
                    }
                    return (sum / (endBin - startBin)) * 0.6 + peakValue * 0.4;
                })(),

                // Dot 2: Low frequencies (100-500 Hz) - fundamental frequency
                (() => {
                    const startBin = Math.floor(100 / 62.5);
                    const endBin = Math.floor(500 / 62.5);
                    let sum = 0;
                    let peakValue = 0;
                    for (let j = startBin; j < endBin && j < dataArray.length; j++) {
                        sum += dataArray[j];
                        peakValue = Math.max(peakValue, dataArray[j]);
                    }
                    return (sum / (endBin - startBin)) * 0.7 + peakValue * 0.3;
                })(),

                // Dot 3: High frequencies (1000-3000 Hz) - consonants and clarity
                (() => {
                    const startBin = Math.floor(1000 / 62.5);
                    const endBin = Math.floor(3000 / 62.5);
                    let sum = 0;
                    let peakValue = 0;
                    for (let j = startBin; j < endBin && j < dataArray.length; j++) {
                        sum += dataArray[j];
                        peakValue = Math.max(peakValue, dataArray[j]);
                    }
                    return (sum / (endBin - startBin)) * 0.5 + peakValue * 0.5;
                })()
            ];

            for (let i = 0; i < dotCount; i++) {
                const x = startX + (fixedGap * i);

                const average = dotValues[i];
                const normalizedValue = average / 255;

                // More aggressive boosting for voice frequencies
                const boostFactors = [2.5, 2.2, 2.8];
                const boostedValue = Math.min(1, normalizedValue * boostFactors[i]);

                // Less smoothing for more responsive animation
                const smoothingFactor = 0.15;
                smoothedValuesRef.current[i] = smoothedValuesRef.current[i] * (1 - smoothingFactor) + boostedValue * smoothingFactor;
                const smoothedValue = smoothedValuesRef.current[i];

                // ADJUSTABLE: Maximum bar height controlled by maxBarExtension prop
                // Edge dots (positions 0 and 2) use 50% of max height, middle dot uses full height
                const edgeDotScale = 0.7; // Edge dots extend to 50% of max height
                const dotMaxHeight = i === 1 ?
                    radius * maxBarExtension :  // Middle dot: full extension
                    radius * maxBarExtension * edgeDotScale; // Edge dots: 50% of max extension

                // Calculate the bar height based on audio level
                const barHeight = Math.max(minDotRadius * 2, smoothedValue * dotMaxHeight);
                const cornerRadius = barWidth / 2; // Fully rounded ends

                // Create gradient for the bar
                const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);
                gradient.addColorStop(0, 'rgba(70, 160, 200, 0.9)');
                gradient.addColorStop(0.5, 'rgba(70, 160, 200, 0.7)');
                gradient.addColorStop(1, 'rgba(70, 160, 200, 0.5)');

                ctx.fillStyle = gradient;

                // Draw rounded rectangle (bar with rounded edges)
                ctx.beginPath();

                if (barHeight <= minDotRadius * 2.5) {
                    // When very small, just draw a circle (dot)
                    ctx.arc(x, centerY, minDotRadius, 0, Math.PI * 2);
                } else {
                    // Draw a rounded rectangle centered at the dot position
                    const rectX = x - barWidth / 2;
                    const rectY = centerY - barHeight / 2;

                    // Create rounded rectangle path
                    ctx.moveTo(rectX + cornerRadius, rectY);
                    ctx.lineTo(rectX + barWidth - cornerRadius, rectY);
                    ctx.quadraticCurveTo(rectX + barWidth, rectY, rectX + barWidth, rectY + cornerRadius);
                    ctx.lineTo(rectX + barWidth, rectY + barHeight - cornerRadius);
                    ctx.quadraticCurveTo(rectX + barWidth, rectY + barHeight, rectX + barWidth - cornerRadius, rectY + barHeight);
                    ctx.lineTo(rectX + cornerRadius, rectY + barHeight);
                    ctx.quadraticCurveTo(rectX, rectY + barHeight, rectX, rectY + barHeight - cornerRadius);
                    ctx.lineTo(rectX, rectY + cornerRadius);
                    ctx.quadraticCurveTo(rectX, rectY, rectX + cornerRadius, rectY);
                }

                ctx.fill();
            }

            // Optional: Draw circle border for visual clarity
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            ctx.stroke();
        };

        const draw = (): void => {
            if (!isActive || !analyserRef.current || bufferLengthRef.current === 0) {
                // Clear canvas and draw inactive state
                ctx.clearRect(0, 0, size, size);

                // Draw circular background
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.fillStyle = backgroundColor;
                ctx.fill();

                // Draw static dots when inactive
                const dotCount = 3;
                const totalWidth = (dotCount - 1) * fixedGap;
                const startX = centerX - totalWidth / 2;

                for (let i = 0; i < dotCount; i++) {
                    const x = startX + (fixedGap * i);

                    ctx.fillStyle = 'rgba(70, 160, 200, 0.3)';
                    ctx.beginPath();
                    ctx.arc(x, centerY, minDotRadius, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Optional: Draw circle border
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius - 1, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Reset smoothed values when inactive
                smoothedValuesRef.current = [0, 0, 0];

                animationIdRef.current = requestAnimationFrame(draw);
                return;
            }

            animationIdRef.current = requestAnimationFrame(draw);
            drawDots(ctx);
        };

        // Start drawing
        draw();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [isActive, size, maxBarExtension, backgroundColor]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                borderRadius: '50%',
                display: 'block',
                width: `${size}px`,
                height: `${size}px`
            }}
            aria-label={isActive ? "Audio input visualizer showing active recording" : "Audio input visualizer inactive"}
        />
    );
};

export default AudioVisualizer;