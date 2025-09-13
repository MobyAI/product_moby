import type { ScriptElement } from '@/types/script';

export type FirestoreScriptElement = {
    index: number;
    type: 'scene' | 'line' | 'direction';
    text: string;
    character?: string | null;
    gender?: string | null;
    tone?: string | null;
    role?: 'user' | 'scene-partner' | null;
    lineEndKeywords?: string[] | null;
    actingInstructions?: string | null;
    expectedEmbedding?: number[] | null;
    ttsUrl?: string | null;
    voiceId?: string | null;
    voiceName?: string | null;
    customDelay?: number | null;
};

const toFirestoreEl = (el: ScriptElement): FirestoreScriptElement => ({
    index: el.index,
    type: el.type,
    text: el.text,
    character: el.character ?? null,
    gender: el.gender ?? null,
    tone: el.tone ?? null,
    role: el.role ?? null,
    lineEndKeywords: el.lineEndKeywords?.filter((s): s is string => typeof s === 'string') ?? null,
    actingInstructions: el.actingInstructions ?? null,
    expectedEmbedding: el.expectedEmbedding?.filter((n): n is number => Number.isFinite(n)) ?? null,
    ttsUrl: el.ttsUrl ?? null,
    voiceId: el.voiceId ?? null,
    voiceName: el.voiceName ?? null,
    customDelay: el.customDelay ?? null,
});

export const toFirestoreScript = (arr: ScriptElement[]): FirestoreScriptElement[] =>
    arr.map(toFirestoreEl);
