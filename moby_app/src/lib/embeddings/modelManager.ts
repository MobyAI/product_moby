import { pipeline, env } from '@xenova/transformers';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

// Configure environment
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface EmbeddingModelState {
    status: 'idle' | 'downloading' | 'initializing' | 'ready' | 'error';
    progress: number;
    error?: string;
    model?: FeatureExtractionPipeline;
}

class EmbeddingModelManager {
    private static instance: EmbeddingModelManager | null = null;
    private model: FeatureExtractionPipeline | null = null;
    private initializationPromise: Promise<void> | null = null;
    private state: EmbeddingModelState = {
        status: 'idle',
        progress: 0
    };
    private stateCallbacks: Set<(state: EmbeddingModelState) => void> = new Set();

    private constructor() { }

    static getInstance(): EmbeddingModelManager {
        if (!EmbeddingModelManager.instance) {
            EmbeddingModelManager.instance = new EmbeddingModelManager();
        }
        return EmbeddingModelManager.instance;
    }

    onStateChange(callback: (state: EmbeddingModelState) => void) {
        this.stateCallbacks.add(callback);
        callback(this.state);

        return () => {
            this.stateCallbacks.delete(callback);
        };
    }

    private updateState(updates: Partial<EmbeddingModelState>) {
        this.state = { ...this.state, ...updates };
        this.stateCallbacks.forEach(cb => cb(this.state));
    }

    async initialize(): Promise<void> {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        if (this.model && this.state.status === 'ready') {
            return;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    private async _performInitialization(): Promise<void> {
        try {
            this.updateState({ status: 'downloading', progress: 0 });

            // Check if model is already in browser cache
            const modelId = 'Xenova/bge-small-en-v1.5';

            // This will use cached files if available
            this.model = await pipeline(
                'feature-extraction',
                modelId,
                {
                    quantized: true,
                    // Add cache check
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    progress_callback: (progress: any) => {
                        // If files are cached, this will be very fast
                        if (progress.status === 'ready') {
                            console.log('✅ Model loaded from browser cache');
                            this.updateState({ status: 'initializing', progress: 100 });
                        } else if (progress.status === 'download' && progress.file) {
                            console.log(`Downloading: ${progress.file}`);
                        } else if (progress.status === 'progress' && progress.total) {
                            const percent = Math.round((progress.loaded / progress.total) * 100);
                            this.updateState({ progress: percent });
                        }
                    }
                }
            ) as FeatureExtractionPipeline;

            // Warm up the model
            console.log('🔥 Warming up model...');
            await this.model('test', { pooling: 'mean', normalize: true });

            this.updateState({
                status: 'ready',
                model: this.model
            });
            console.log('✅ Embedding model ready');

        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Failed to initialize:', error);
            this.updateState({
                status: 'error',
                error: errorMsg
            });
            throw error;
        } finally {
            this.initializationPromise = null;
        }
    }

    async getSimilarity(text1: string, text2: string): Promise<number> {
        if (!this.model || this.state.status !== 'ready') {
            throw new Error('Model not initialized. Call initialize() first.');
        }

        const clean1 = text1.toLowerCase().trim();
        const clean2 = text2.toLowerCase().trim();

        // Get embeddings - correct usage
        const result1 = await this.model(clean1, {
            pooling: 'mean',
            normalize: true
        });

        const result2 = await this.model(clean2, {
            pooling: 'mean',
            normalize: true
        });

        // Avoid Array.from; work directly with TypedArray
        const v1 = result1.data as Float32Array;
        const v2 = result2.data as Float32Array;

        // dot product (cosine because already normalized)
        let sim = 0;
        for (let i = 0; i < v1.length; i++) sim += v1[i] * v2[i];
        return sim;
    }

    getState(): EmbeddingModelState {
        return this.state;
    }

    isReady(): boolean {
        return this.state.status === 'ready' && this.model !== null;
    }
}

export const embeddingModel = EmbeddingModelManager.getInstance();