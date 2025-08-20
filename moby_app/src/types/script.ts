import type { Timestamp, FieldValue } from "firebase/firestore";

export type FireDate = Timestamp | FieldValue | null;

export type ScriptDoc = {
    name: string;
    script: ScriptElement[];
    ownerUid: string;
    createdAt: Timestamp | FieldValue | null;
    updatedAt: Timestamp | FieldValue | null;
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