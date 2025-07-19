export type ScriptElement = {
    index: number;
    type: 'scene' | 'line' | 'direction';
    text: string;
    character?: string;
    gender?: string;
    tone?: string;
    role?: 'user' | 'scene-partner';
    lineEndKeywords?: string[];
    expectedEmbedding?: number[];
    ttsUrl?: string;
};