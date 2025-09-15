import { Howl } from 'howler';
import { ref, getDownloadURL } from 'firebase/storage';
import { doc, getDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase/client/config/app';
import { updateScript } from '@/lib/firebase/client/scripts';
import { set } from 'idb-keyval';

interface AudioItem {
    url: string;
    storagePath?: string;
    lineIndex?: number;
}

interface PreloadedAudio {
    url: string;
    howl?: Howl;
    audio?: HTMLAudioElement;
    preloadedAt: number;
}

interface RefreshUrlOptions {
    storagePath: string;
    scriptId: string;
    userId: string;
    lineIndex: number;
    onUrlRefreshed?: (newUrl: string) => void;
}

interface PlayMetadata {
    storagePath?: string;
    lineIndex?: number;
    scriptId?: string;
    userId?: string;
    onUrlRefreshed?: (newUrl: string) => void;
}

interface PreloadMetadata {
    scriptId?: string;
    userId?: string;
    onUrlRefreshed?: (lineIndex: number, newUrl: string) => void;
}

export class AudioPlayerWithFallbacks {
    private currentHowl: Howl | null = null;
    private currentAudio: HTMLAudioElement | null = null;
    private isPlaying = false;
    private preloadCache = new Map<string, PreloadedAudio>();
    private urlRefreshCache = new Map<string, string>(); // storagePath -> fresh URL
    private readonly URL_CACHE_DURATION = 20 * 60 * 1000; // 20 minutes

    // Refresh URL and update Firestore (matching hydrate script process)
    async refreshUrl(options: RefreshUrlOptions): Promise<string> {
        const { storagePath, scriptId, userId, lineIndex, onUrlRefreshed } = options;

        try {
            // Check cache first
            const cached = this.urlRefreshCache.get(storagePath);
            if (cached) {
                console.log('Using cached fresh URL for:', storagePath);
                return cached;
            }

            console.log(`🔄 Refreshing URL for line ${lineIndex}...`);

            // Get fresh URL from storage
            const storageRef = ref(storage, storagePath);
            const freshUrl = await getDownloadURL(storageRef);
            console.log(`fresh URL for line ${lineIndex}: `, freshUrl);

            // Cache the fresh URL immediately
            this.urlRefreshCache.set(storagePath, freshUrl);
            setTimeout(() => {
                this.urlRefreshCache.delete(storagePath);
            }, this.URL_CACHE_DURATION);

            // Update local state immediately
            if (onUrlRefreshed) {
                onUrlRefreshed(freshUrl);
            }

            // Try to persist, but don't fail if it doesn't work
            this.persistUrlUpdate(freshUrl, scriptId, userId, lineIndex)
                .catch(error => {
                    // Log but don't throw - we have the fresh URL already
                    console.warn('Failed to persist URL update, but continuing with fresh URL:', error);
                });

            return freshUrl;

        } catch (error) {
            console.error(`❌ Failed to refresh URL for line ${lineIndex}:`, error);
            throw error;
        }
    }

    // Separate method for persistence
    private async persistUrlUpdate(
        freshUrl: string,
        scriptId: string,
        userId: string,
        lineIndex: number
    ): Promise<void> {
        try {
            // Get current script
            const scriptDocRef = doc(db, 'users', userId, 'scripts', scriptId);
            const scriptDoc = await getDoc(scriptDocRef);

            if (!scriptDoc.exists()) {
                throw new Error('Script document not found');
            }

            const scriptData = scriptDoc.data();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const updatedScript = scriptData.script.map((element: any) => {
                if (element.index === lineIndex) {
                    return {
                        ...element,
                        ttsUrl: freshUrl,
                        ttsUrlRefreshedAt: new Date().toISOString() // Add timestamp
                    };
                }
                return element;
            });

            console.log('Persisting fresh URL to Firestore...');

            // Update Firestore
            await updateScript(scriptId, updatedScript);
            console.log(`✅ Updated Firestore with fresh URL for line ${lineIndex}`);

            // Update IndexedDB cache
            const cacheKey = `script-cache:${userId}:${scriptId}`;
            try {
                await set(cacheKey, updatedScript);
                console.log('💾 Script cached successfully in IndexedDB with fresh URL');
            } catch (cacheError) {
                console.warn('⚠️ Failed to update IndexedDB cache with fresh URL:', cacheError);
                // Don't throw - Firestore update succeeded
            }

        } catch (error) {
            // This error will be caught by the .catch() in refreshUrl
            throw error;
        }
    }

    // Preload audio with automatic URL refresh on failure
    async preload(items: AudioItem[], metadata?: PreloadMetadata): Promise<Map<string, boolean>> {
        const results = new Map<string, boolean>();

        console.log(`📦 Preloading ${items.length} audio files...`);

        await Promise.all(
            items.map(async (item) => {
                const key = item.url;

                try {
                    // Check if already preloaded
                    const existing = this.preloadCache.get(key);
                    if (existing && (Date.now() - existing.preloadedAt < this.URL_CACHE_DURATION)) {
                        console.log(`Already preloaded: ${item.lineIndex}`);
                        results.set(key, true);
                        return;
                    }

                    // Try to preload with Howler first
                    const howl = await this.preloadWithHowler(item.url);

                    this.preloadCache.set(key, {
                        url: item.url,
                        howl,
                        preloadedAt: Date.now()
                    });

                    results.set(key, true);
                    console.log(`✅ Preloaded: ${item.lineIndex}`);

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    console.warn(`Failed to preload ${item.lineIndex}:`, error);

                    // If it's a network/403 error and we have required metadata
                    if (
                        item.storagePath &&
                        item.lineIndex !== undefined &&
                        metadata?.scriptId &&
                        metadata?.userId &&
                        this.isNetworkError(error)
                    ) {
                        try {
                            console.log(`Attempting fresh URL for preload for ${item.lineIndex}: ${key}`);
                            const freshUrl = await this.refreshUrl({
                                storagePath: item.storagePath,
                                scriptId: metadata.scriptId,
                                userId: metadata.userId,
                                lineIndex: item.lineIndex,
                                onUrlRefreshed: (newUrl) => {
                                    metadata.onUrlRefreshed?.(item.lineIndex!, newUrl);
                                }
                            });

                            // Try preloading with fresh URL
                            const howl = await this.preloadWithHowler(freshUrl);

                            this.preloadCache.set(key, {
                                url: freshUrl,
                                howl,
                                preloadedAt: Date.now()
                            });

                            results.set(key, true);
                            console.log(`✅ Preloaded with fresh URL for ${item.lineIndex}: ${key}`);
                        } catch (refreshError) {
                            console.error(`Failed even with fresh URL for ${item.lineIndex}: ${key}`, refreshError);
                            results.set(key, false);
                        }
                    } else {
                        results.set(key, false);
                    }
                }
            })
        );

        // Log summary
        const successCount = Array.from(results.values()).filter(v => v).length;
        console.log(`📦 Preload complete: ${successCount}/${items.length} successful`);

        return results;
    }

    private preloadWithHowler(url: string): Promise<Howl> {
        return new Promise((resolve, reject) => {
            const howl = new Howl({
                src: [url],
                format: ['mp3'],
                html5: true,
                preload: true,
                volume: 1.0,
                onload: () => resolve(howl),
                onloaderror: (id, error) => reject(new Error(`Howler preload error: ${error}`))
            });
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private isNetworkError(error: any): boolean {
        const errorStr = error?.message || error?.toString() || '';
        return errorStr.includes('403') ||
            errorStr.includes('404') ||
            errorStr.includes('Forbidden') ||
            errorStr.includes('Not Found') ||
            errorStr.includes('4') || // Howler error code 4
            errorStr.includes('network') ||
            errorStr.includes('Network');
    }

    async play(url: string, metadata?: PlayMetadata): Promise<void> {
        // Clean up any existing audio
        this.stop();
        this.isPlaying = true;

        console.log('🎵 Attempting to play audio:', url.substring(0, 100) + '...');

        // Check preload cache first
        const cacheKey = url;
        const preloaded = this.preloadCache.get(cacheKey);

        if (preloaded && preloaded.howl) {
            try {
                console.log('Using preloaded audio');
                await this.playPreloadedHowl(preloaded.howl);
                return;
            } catch {
                console.warn('Preloaded audio failed, trying fresh strategies');
                this.preloadCache.delete(cacheKey);
            }
        }

        // Try regular playback strategies
        let urlToPlay = url;
        let retryWithFreshUrl = false;

        for (let attempt = 0; attempt < 2; attempt++) {
            const strategies = [
                { name: 'Howler.js', fn: () => this.playWithHowler(urlToPlay) },
                { name: 'Web Audio API', fn: () => this.playWithWebAudio(urlToPlay) },
                { name: 'HTML5 Audio', fn: () => this.playWithHTML5(urlToPlay) },
                { name: 'Blob Fallback', fn: () => this.playWithBlobFallback(urlToPlay) },
            ];

            for (const strategy of strategies) {
                if (!this.isPlaying) {
                    console.log('Playback cancelled');
                    return;
                }

                try {
                    console.log(`Trying ${strategy.name}...`);
                    await strategy.fn();
                    console.log(`✅ ${strategy.name} succeeded`);

                    // If we used a fresh URL, update the cache with the new URL
                    if (attempt > 0 && urlToPlay !== url) {
                        // Remove old URL from cache
                        this.preloadCache.delete(url);

                        // Add fresh URL to cache
                        this.preloadCache.set(urlToPlay, {
                            url: urlToPlay,
                            preloadedAt: Date.now()
                        });
                    }

                    return; // Success!
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                } catch (error: any) {
                    console.warn(`❌ ${strategy.name} failed:`, error);

                    // On first attempt, if network error and we have required metadata
                    if (
                        attempt === 0 &&
                        metadata?.storagePath &&
                        metadata?.scriptId &&
                        metadata?.userId &&
                        metadata?.lineIndex !== undefined &&
                        this.isNetworkError(error)
                    ) {
                        retryWithFreshUrl = true;
                    }
                }
            }

            // If first attempt failed and we should retry with fresh URL
            if (attempt === 0 && retryWithFreshUrl && metadata) {
                try {
                    console.log('Getting fresh URL for retry...');
                    urlToPlay = await this.refreshUrl({
                        storagePath: metadata.storagePath!,
                        scriptId: metadata.scriptId!,
                        userId: metadata.userId!,
                        lineIndex: metadata.lineIndex!,
                        onUrlRefreshed: metadata.onUrlRefreshed
                    });
                    console.log('Retrying all strategies with fresh URL...');
                } catch (refreshError) {
                    console.error('Failed to get fresh URL:', refreshError);
                    break;
                }
            } else {
                break; // No more retries
            }
        }

        throw new Error('All playback strategies failed');
    }

    private playPreloadedHowl(howl: Howl): Promise<void> {
        return new Promise((resolve, reject) => {
            this.currentHowl = howl;

            // Set up event handlers
            howl.once('end', () => {
                this.currentHowl = null;
                resolve();
            });

            howl.once('playerror', (id, error) => {
                this.currentHowl = null;
                reject(new Error(`Preloaded Howl play error: ${error}`));
            });

            // Play
            howl.play();
        });
    }

    private playWithHowler(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.currentHowl = new Howl({
                src: [url],
                format: ['mp3'],
                html5: true, // Important for CORS
                preload: true,
                volume: 1.0,
                onload: () => {
                    console.log('Howler: Audio loaded');
                },
                onplay: () => {
                    console.log('Howler: Playing');
                },
                onend: () => {
                    console.log('Howler: Ended');
                    this.currentHowl = null;
                    resolve();
                },
                onloaderror: (id, error) => {
                    console.error('Howler: Load error:', error);
                    this.currentHowl = null;
                    reject(new Error(`Howler load error: ${error}`));
                },
                onplayerror: (id, error) => {
                    console.error('Howler: Play error:', error);

                    // Try to unlock audio context and retry once
                    this.currentHowl?.once('unlock', () => {
                        console.log('Howler: Retrying after unlock');
                        this.currentHowl?.play();
                    });

                    // Still reject to try next strategy
                    reject(new Error(`Howler play error: ${error}`));
                }
            });

            // Start playback
            this.currentHowl.play();
        });
    }

    private async playWithWebAudio(url: string): Promise<void> {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        try {
            // Resume context if suspended
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            // Fetch and decode audio
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Create and play source
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            return new Promise((resolve, reject) => {
                source.onended = () => {
                    audioContext.close();
                    resolve();
                };

                try {
                    source.start(0);
                } catch (error) {
                    audioContext.close();
                    reject(error);
                }
            });
        } catch (error) {
            audioContext.close();
            throw error;
        }
    }

    private playWithHTML5(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.currentAudio = new Audio();
            this.currentAudio.preload = 'auto';
            this.currentAudio.crossOrigin = 'anonymous';

            const audio = this.currentAudio;

            // Set up event handlers
            const handleCanPlay = () => {
                audio.play()
                    .then(() => {
                        console.log('HTML5 Audio: Playing');
                    })
                    .catch((error) => {
                        cleanup();
                        reject(error);
                    });
            };

            const handleEnded = () => {
                cleanup();
                resolve();
            };

            const handleError = () => {
                const error = audio.error;
                cleanup();
                reject(new Error(`HTML5 Audio error: ${error?.message || 'Unknown error'}`));
            };

            const cleanup = () => {
                audio.removeEventListener('canplaythrough', handleCanPlay);
                audio.removeEventListener('ended', handleEnded);
                audio.removeEventListener('error', handleError);
                this.currentAudio = null;
            };

            // Attach event listeners
            audio.addEventListener('canplaythrough', handleCanPlay, { once: true });
            audio.addEventListener('ended', handleEnded, { once: true });
            audio.addEventListener('error', handleError, { once: true });

            // Start loading
            audio.src = url;
            audio.load();
        });
    }

    private async playWithBlobFallback(url: string): Promise<void> {
        // Fetch as blob first
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        try {
            // Try to play the blob URL with HTML5 audio
            await this.playWithHTML5(blobUrl);
        } finally {
            // Clean up blob URL
            URL.revokeObjectURL(blobUrl);
        }
    }

    stop() {
        this.isPlaying = false;

        // Stop Howler
        if (this.currentHowl) {
            this.currentHowl.stop();
            this.currentHowl.unload();
            this.currentHowl = null;
        }

        // Stop HTML5 Audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = '';
            this.currentAudio = null;
        }
    }

    // Clear preload cache for specific items or all
    clearPreloadCache(lineIds?: string[]) {
        if (lineIds) {
            lineIds.forEach(id => {
                const cached = this.preloadCache.get(id);
                if (cached?.howl) {
                    cached.howl.unload();
                }
                this.preloadCache.delete(id);
            });
        } else {
            // Clear all
            this.preloadCache.forEach(cached => {
                if (cached.howl) {
                    cached.howl.unload();
                }
            });
            this.preloadCache.clear();
        }

        this.urlRefreshCache.clear();
    }

    // Get cache status
    getCacheStatus() {
        return {
            preloadedCount: this.preloadCache.size,
            cachedUrlsCount: this.urlRefreshCache.size,
            preloadedIds: Array.from(this.preloadCache.keys())
        };
    }
}