import type { Timestamp } from "firebase/firestore";

export type FireDate = Timestamp | null;

export type ScriptDoc = {
    name: string;
    script: ScriptElement[];
    ownerUid: string;
    createdAt: Timestamp | null;
    updatedAt: Timestamp | null;
    lastPracticed: Timestamp | null;
};

export type WithId<T> = T & { id: string };

export type ScriptDocWithId = WithId<ScriptDoc>;

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