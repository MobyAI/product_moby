import { create } from 'zustand';

type ScriptElement = { index: number; type: 'scene' | 'line' | 'direction'; text: string; character?: string; tone?: string; role?: 'user' | 'ai'; };

type Store = {
    script: ScriptElement[];
    setScript: (script: ScriptElement[]) => void;
};

export const storeScript = create<Store>((set) => ({
    script: [],
    setScript: (script) => set({ script }),
}));