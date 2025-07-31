export type ScriptElement = {
    index: number;
    type: 'scene' | 'line' | 'direction';
    text: string;
    character?: string;
    gender?: string;
    tone?: string;
    role?: 'user' | 'scene-partner';
    lineEndKeywords?: string[];
    actingInstructions?: string;
    expectedEmbedding?: number[];
    ttsUrl?: string;
    voiceId?: string;
    voiceName?: string;
};