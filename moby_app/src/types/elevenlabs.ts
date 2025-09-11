/**
 * Voice settings for controlling speech generation characteristics
 */
export interface VoiceSettings {
    /** Controls randomness/variability (0.0-1.0). Lower = more expressive, Higher = more consistent */
    stability?: number;
    /** Controls adherence to original voice (0.0-1.0). Higher = closer to original */
    similarityBoost?: number;
    /** Controls emotional intensity (0.0-1.0). v3 only. Higher = more dramatic */
    style?: number;
    /** Enhances voice clarity and presence. Good for narration */
    useSpeakerBoost?: boolean;
}

/**
 * Text normalization options
 */
export type TextNormalization = 'auto' | 'on' | 'off';

/**
 * Main TTS options for v3 API (server-side)
 */
export interface TTSOptions {
    text: string;
    voiceId: string;
    modelId?: string; // Optional since we're defaulting to v3
    voiceSettings?: VoiceSettings;
    languageCode?: string;
    seed?: number;
    applyTextNormalization?: TextNormalization;
    outputFormat?: string;
}

/**
 * Client request interface (no modelId needed for v3-only)
 */
export interface TTSRequestV3 {
    text: string;
    voiceId: string;
    voiceSettings?: VoiceSettings;
    languageCode?: string;
    seed?: number;
    applyTextNormalization?: TextNormalization;
    outputFormat?: string;
}