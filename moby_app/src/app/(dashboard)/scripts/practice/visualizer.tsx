import React, { useRef, useEffect } from 'react';

type VisualizationType = 'bars' | 'dots';

interface AudioVisualizerProps {
    /** The AudioContext from your STT setup */
    audioContext: AudioContext | null;
    /** The source node (MediaStreamSource) from your STT setup */
    sourceNode: MediaStreamAudioSourceNode | null;
    /** Whether recording/STT is active */
    isActive: boolean;
    /** Type of visualization */
    visualizationType?: VisualizationType;
    /** Canvas width in pixels */
    width?: number;
    /** Canvas height in pixels */
    height?: number;
    /** Primary color for the visualization */
    color?: string;
    /** Background color of the canvas */
    backgroundColor?: string;
    /** Optional className for styling */
    className?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
    audioContext,
    sourceNode,
    isActive = false,
    visualizationType = 'dots',
    width = 120,
    height = 100,
    color = 'rgba(255, 255, 255, 0.8)',
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
        canvas.width = width;
        canvas.height = height;

        const drawFrequencyBars = (ctx: CanvasRenderingContext2D): void => {
            if (!analyserRef.current || bufferLengthRef.current === 0) return;

            // Create a fresh array each time
            const dataArray = new Uint8Array(bufferLengthRef.current);
            analyserRef.current.getByteFrequencyData(dataArray);

            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            const barWidth = (width / dataArray.length) * 2.5;
            let x = 0;

            for (let i = 0; i < dataArray.length; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.8;

                // Create gradient
                const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, 'rgba(76, 175, 80, 0.3)');
                gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.6)');
                gradient.addColorStop(1, 'rgba(76, 175, 80, 0.9)');

                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);

                x += barWidth;
            }
        };

        const drawDots = (ctx: CanvasRenderingContext2D): void => {
            if (!analyserRef.current || bufferLengthRef.current === 0) return;

            // Create a fresh array each time
            const dataArray = new Uint8Array(bufferLengthRef.current);
            analyserRef.current.getByteFrequencyData(dataArray);

            // Clear canvas
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, width, height);

            // Calculate positions for 3 dots with FIXED spacing
            const dotCount = 3;
            const fixedGap = 20; // Fixed gap between dots in pixels
            const totalWidth = (dotCount - 1) * fixedGap; // Total width of the dot group
            const startX = (width - totalWidth) / 2; // Center the group horizontally
            const centerY = height / 2;
            const minDotRadius = 5; // Minimum dot size
            const maxBarHeight = height * 0.7; // Maximum bar height (70% of canvas)
            const barWidth = 12; // Width of the expanded bars

            // With 16kHz sample rate and FFT size of 256:
            // Each bin = 16000 / 256 = 62.5 Hz
            // Voice range (0-4kHz) = first 64 bins (4000 / 62.5)
            // Total bins = 128 (bufferLength)
            const voiceBins = Math.min(64, bufferLengthRef.current);

            // Three different sampling strategies for visual variety
            const dotValues = [

                // Dot 1: Mid frequencies (300-1500 Hz) - main voice energy
                (() => {
                    const startBin = Math.floor(300 / 62.5);  // ~300Hz
                    const endBin = Math.floor(1500 / 62.5);   // ~1500Hz
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
                    const startBin = Math.floor(100 / 62.5); // ~100Hz
                    const endBin = Math.floor(500 / 62.5);   // ~500Hz
                    let sum = 0;
                    let peakValue = 0;
                    for (let j = startBin; j < endBin && j < dataArray.length; j++) {
                        sum += dataArray[j];
                        peakValue = Math.max(peakValue, dataArray[j]);
                    }
                    // Mix average and peak for responsiveness
                    return (sum / (endBin - startBin)) * 0.7 + peakValue * 0.3;
                })(),

                // Dot 3: High frequencies (1000-3000 Hz) - consonants and clarity
                (() => {
                    const startBin = Math.floor(1000 / 62.5); // ~1000Hz
                    const endBin = Math.floor(3000 / 62.5);   // ~3000Hz
                    let sum = 0;
                    let peakValue = 0;
                    for (let j = startBin; j < endBin && j < dataArray.length; j++) {
                        sum += dataArray[j];
                        peakValue = Math.max(peakValue, dataArray[j]);
                    }
                    // Use more peak detection for high frequencies
                    return (sum / (endBin - startBin)) * 0.5 + peakValue * 0.5;
                })()
            ];

            // Debug logging to see what values we're getting
            if (Math.random() < 0.01) { // Log occasionally
                console.log('Frequency bin values:', {
                    dot1_low: Math.round(dotValues[0]),
                    dot2_mid: Math.round(dotValues[1]),
                    dot3_high: Math.round(dotValues[2]),
                    totalBins: bufferLengthRef.current,
                    first10bins: Array.from(dataArray.slice(0, 10)).map(v => Math.round(v))
                });
            }

            for (let i = 0; i < dotCount; i++) {
                const x = startX + (fixedGap * i);

                const average = dotValues[i];
                const normalizedValue = average / 255;

                // More aggressive boosting for voice frequencies
                const boostFactors = [2.5, 2.2, 2.8]; // Higher boosts for voice
                const boostedValue = Math.min(1, normalizedValue * boostFactors[i]);

                // Less smoothing for more responsive animation
                const smoothingFactor = 0.15;
                smoothedValuesRef.current[i] = smoothedValuesRef.current[i] * (1 - smoothingFactor) + boostedValue * smoothingFactor;
                const smoothedValue = smoothedValuesRef.current[i];

                // Lower threshold for movement
                const adjustedValue = smoothedValue;

                // Calculate the bar height based on audio level
                const barHeight = Math.max(minDotRadius * 2, adjustedValue * maxBarHeight);
                const cornerRadius = barWidth / 2; // Fully rounded ends

                // Create gradient for the bar - different color tints for each dot
                const gradient = ctx.createLinearGradient(x, centerY - barHeight / 2, x, centerY + barHeight / 2);

                // Vary colors slightly for each dot
                if (i === 0) {
                    // Left dot - slightly blue tinted
                    gradient.addColorStop(0, 'rgba(70, 160, 200, 0.9)');
                    gradient.addColorStop(0.5, 'rgba(70, 160, 200, 0.7)');
                    gradient.addColorStop(1, 'rgba(70, 160, 200, 0.5)');
                } else if (i === 1) {
                    // Middle dot - green
                    gradient.addColorStop(0, 'rgba(76, 175, 80, 0.9)');
                    gradient.addColorStop(0.5, 'rgba(76, 175, 80, 0.7)');
                    gradient.addColorStop(1, 'rgba(76, 175, 80, 0.5)');
                } else {
                    // Right dot - slightly purple tinted
                    gradient.addColorStop(0, 'rgba(150, 100, 200, 0.9)');
                    gradient.addColorStop(0.5, 'rgba(150, 100, 200, 0.7)');
                    gradient.addColorStop(1, 'rgba(150, 100, 200, 0.5)');
                }

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

                // Add a subtle glow effect when active
                if (adjustedValue > 0.03) {
                    ctx.shadowBlur = 20 * adjustedValue;
                    if (i === 0) {
                        ctx.shadowColor = 'rgba(70, 160, 200, 0.6)';
                    } else if (i === 1) {
                        ctx.shadowColor = 'rgba(76, 175, 80, 0.6)';
                    } else {
                        ctx.shadowColor = 'rgba(150, 100, 200, 0.6)';
                    }
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }
            }
        };

        const draw = (): void => {
            if (!isActive || !analyserRef.current || bufferLengthRef.current === 0) {
                // Clear canvas when inactive
                ctx.fillStyle = backgroundColor;
                ctx.fillRect(0, 0, width, height);

                if (visualizationType === 'dots') {
                    // Draw static dots when inactive - centered with fixed spacing
                    const dotCount = 3;
                    const fixedGap = 20; // Fixed gap between dots
                    const totalWidth = (dotCount - 1) * fixedGap;
                    const startX = (width - totalWidth) / 2;
                    const centerY = height / 2;
                    const dotRadius = 5;

                    for (let i = 0; i < dotCount; i++) {
                        const x = startX + (fixedGap * i);

                        // Different subtle colors for each dot when inactive
                        if (i === 0) {
                            ctx.fillStyle = 'rgba(70, 160, 200, 0.3)';
                        } else if (i === 1) {
                            ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
                        } else {
                            ctx.fillStyle = 'rgba(150, 100, 200, 0.3)';
                        }

                        ctx.beginPath();
                        ctx.arc(x, centerY, dotRadius, 0, Math.PI * 2);
                        ctx.fill();
                    }

                    // Reset smoothed values when inactive
                    smoothedValuesRef.current = [0, 0, 0];
                } else {
                    // Draw inactive state indicator for bars mode
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const time = Date.now() / 1000;
                    const pulseRadius = 3 + Math.sin(time * 2) * 1;

                    ctx.beginPath();
                    ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                    ctx.fill();
                }

                animationIdRef.current = requestAnimationFrame(draw);
                return;
            }

            animationIdRef.current = requestAnimationFrame(draw);

            switch (visualizationType) {
                case 'bars':
                    drawFrequencyBars(ctx);
                    break;
                case 'dots':
                    drawDots(ctx);
                    break;
                default:
                    drawDots(ctx);
            }
        };

        // Start drawing
        draw();

        return () => {
            if (animationIdRef.current) {
                cancelAnimationFrame(animationIdRef.current);
            }
        };
    }, [isActive, visualizationType, width, height, color, backgroundColor]);

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={{
                borderRadius: '8px',
                backgroundColor,
                display: 'block',
                width: `${width}px`,
                height: `${height}px`
            }}
            aria-label={isActive ? "Audio input visualizer showing active recording" : "Audio input visualizer inactive"}
        />
    );
};

export default AudioVisualizer;