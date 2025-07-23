// // Hume TTS -- No Batch + Context Utterances
// const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const failedIndexes: number[] = [];
//     const withTTS: ScriptElement[] = [];

//     for (let i = 0; i < script.length; i++) {
//         const element = script[i];

//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             const voiceId =
//                 element.gender === 'male'
//                     ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//             try {
//                 const cached = await get(ttsCacheKey);
//                 if (cached) {
//                     const url = URL.createObjectURL(cached);
//                     withTTS.push({ ...element, ttsUrl: url });
//                     continue;
//                 }

//                 // 🔁 Use previous 2 lines as context utterances
//                 const contextUtterance = script
//                     .slice(Math.max(0, i - 2), i)
//                     .filter(l => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
//                     .map(l => ({
//                         text: l.text,
//                         description: (l as any).actingInstructions || '',
//                     }));

//                 const blob = await useHumeTTS({
//                     text: element.text,
//                     voiceId,
//                     voiceDescription: element.actingInstructions || '',
//                     contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined
//                 });

//                 try {
//                     await set(ttsCacheKey, blob);
//                 } catch (setErr) {
//                     console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
//                 }

//                 const url = URL.createObjectURL(blob);
//                 withTTS.push({ ...element, ttsUrl: url });

//                 await new Promise((res) => setTimeout(res, 100));
//             } catch (err) {
//                 console.warn(`⚠️ Failed to generate Hume TTS for line ${element.index}`, err);
//                 failedIndexes.push(element.index);
//                 withTTS.push(element);
//             }
//         } else {
//             withTTS.push(element);
//         }
//     }

//     return [withTTS, failedIndexes];
// };

// const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const hydrated: ScriptElement[] = [];
//     const failedIndexes: number[] = [];

//     for (let i = 0; i < script.length; i++) {
//         const element = script[i];

//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             const voiceId =
//                 element.gender === 'male'
//                     ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//             try {
//                 let blob: Blob | undefined;

//                 // Try loading from cache
//                 try {
//                     blob = await get(ttsCacheKey);
//                 } catch (getErr) {
//                     console.warn(`⚠️ Failed to read cache for line ${element.index}`, getErr);
//                 }

//                 // If missing, regenerate with context
//                 if (!blob) {
//                     console.warn(`💡 TTS blob missing for line ${element.index}, regenerating with Hume...`);

//                     // Grab up to 2 previous lines as context
//                     const contextUtterance = script
//                         .slice(Math.max(0, i - 2), i)
//                         .filter((l) => l.type === 'line' && typeof l.text === 'string' && l.text.trim().length > 0)
//                         .map((l) => ({
//                             text: l.text,
//                             description: (l as any).actingInstructions || '',
//                         }));

//                     blob = await useHumeTTS({
//                         text: element.text,
//                         voiceId,
//                         voiceDescription: element.actingInstructions || '',
//                         contextUtterance: contextUtterance.length > 0 ? contextUtterance : undefined,
//                     });

//                     try {
//                         await set(ttsCacheKey, blob);
//                     } catch (setErr) {
//                         console.warn(`⚠️ Failed to cache regenerated blob for line ${element.index}`, setErr);
//                     }
//                 }

//                 const url = URL.createObjectURL(blob);
//                 hydrated.push({ ...element, ttsUrl: url });
//             } catch (err) {
//                 console.warn(`❌ Failed to hydrate or regenerate Hume TTS for line ${element.index}`, err);
//                 failedIndexes.push(element.index);
//                 hydrated.push(element);
//             }
//         } else {
//             hydrated.push(element);
//         }
//     }

//     return [hydrated, failedIndexes];
// };

// // Hume TTS -- No Batch + No Context Utterances

// const createHumeBatches = (lines: ScriptElement[]): ScriptElement[][] => {
//     const batches: ScriptElement[][] = [];
//     let currentBatch: ScriptElement[] = [];
//     let currentLength = 0;

//     for (const line of lines) {
//         const textLength = line.text.length;
//         const wouldExceedCharLimit = currentLength + textLength > 5000;
//         const wouldExceedBatchSize = currentBatch.length >= 5;

//         if (wouldExceedCharLimit || wouldExceedBatchSize) {
//             batches.push(currentBatch);
//             currentBatch = [];
//             currentLength = 0;
//         }

//         currentBatch.push(line);
//         currentLength += textLength;
//     }

//     if (currentBatch.length > 0) {
//         batches.push(currentBatch);
//     }

//     return batches;
// };

// const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const failedIndexes: number[] = [];
//     const withTTS: ScriptElement[] = [];

//     for (const element of script) {
//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             const voiceId =
//                 element.gender === 'male'
//                     ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//                     : element.gender === 'female'
//                         ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
//                         : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//             try {
//                 const cached = await get(ttsCacheKey);
//                 if (cached) {
//                     const url = URL.createObjectURL(cached);
//                     withTTS.push({ ...element, ttsUrl: url });
//                     continue;
//                 }

//                 const blob = await useHumeTTS({
//                     text: element.text,
//                     voiceId,
//                     voiceDescription: element.actingInstructions || '',
//                 });

//                 try {
//                     await set(ttsCacheKey, blob);
//                 } catch (setErr) {
//                     console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
//                 }

//                 const url = URL.createObjectURL(blob);
//                 withTTS.push({ ...element, ttsUrl: url });

//                 await new Promise((res) => setTimeout(res, 100)); // Optional throttle
//             } catch (err) {
//                 console.warn(`⚠️ Failed to generate Hume TTS for line ${element.index}`, err);
//                 failedIndexes.push(element.index);
//                 withTTS.push(element);
//             }
//         } else {
//             withTTS.push(element);
//         }
//     }

//     return [withTTS, failedIndexes];
// };

// const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const hydrated: ScriptElement[] = [];
//     const failedIndexes: number[] = [];

//     for (const element of script) {
//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             const voiceId =
//                 element.gender === 'male'
//                     ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//             try {
//                 let blob: Blob | undefined;

//                 // 🧪 Try loading from cache
//                 try {
//                     blob = await get(ttsCacheKey);
//                 } catch (getErr) {
//                     console.warn(`⚠️ Failed to read cache for line ${element.index}`, getErr);
//                 }

//                 // 🔁 If missing, regenerate
//                 if (!blob) {
//                     console.warn(`💡 TTS blob missing for line ${element.index}, regenerating with Hume...`);

//                     blob = await useHumeTTS({
//                         text: element.text,
//                         voiceId,
//                         voiceDescription: element.actingInstructions || '',
//                     });

//                     try {
//                         await set(ttsCacheKey, blob);
//                     } catch (setErr) {
//                         console.warn(`⚠️ Failed to cache regenerated blob for line ${element.index}`, setErr);
//                     }
//                 }

//                 const url = URL.createObjectURL(blob);
//                 hydrated.push({ ...element, ttsUrl: url });
//             } catch (err) {
//                 console.warn(`❌ Failed to hydrate or regenerate Hume TTS for line ${element.index}`, err);
//                 failedIndexes.push(element.index);
//                 hydrated.push(element);
//             }
//         } else {
//             hydrated.push(element);
//         }
//     }

//     return [hydrated, failedIndexes];
// };

// // Hume TTS -- Batch
// const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const failedIndexes: number[] = [];
//     const withTTS: ScriptElement[] = [];

//     const linesToBatch: { line: ScriptElement; ttsCacheKey: string; voiceId: string }[] = [];

//     // First pass: check cache or mark for batching
//     for (const element of script) {
//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             const voiceId = element.gender === 'male'
//                 ? 'c5be03fa-09cc-4fc3-8852-7f5a32b5606c'
//                 : element.gender === 'female'
//                     ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
//                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//             try {
//                 const cached = await get(ttsCacheKey);
//                 if (cached) {
//                     const url = URL.createObjectURL(cached);
//                     withTTS.push({ ...element, ttsUrl: url });
//                 } else {
//                     linesToBatch.push({ line: element, ttsCacheKey, voiceId });
//                 }
//             } catch (err) {
//                 console.warn(`⚠️ Error checking cache for line ${element.index}`, err);
//                 linesToBatch.push({ line: element, ttsCacheKey, voiceId });
//             }
//         } else {
//             withTTS.push(element);
//         }
//     }

//     // Create batches from cache-missing lines
//     const batches = createHumeBatches(linesToBatch.map(({ line }) => line));

//     for (const batch of batches) {
//         const payload = batch.map((line) => {
//             const original = linesToBatch.find((item) => item.line.index === line.index);
//             return {
//                 text: line.text,
//                 description: line.actingInstructions || undefined,
//                 voiceId: original?.voiceId!,
//             };
//         });

//         try {
//             const blobs = await useHumeTTSBatch(payload);

//             for (let i = 0; i < batch.length; i++) {
//                 const element = batch[i];
//                 const blob = blobs[i];

//                 if (!blob) {
//                     failedIndexes.push(element.index);
//                     withTTS.push(element);
//                     continue;
//                 }

//                 const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//                 const url = URL.createObjectURL(blob);
//                 withTTS.push({ ...element, ttsUrl: url });

//                 try {
//                     await set(ttsCacheKey, blob);
//                 } catch (err) {
//                     console.warn(`⚠️ Failed to cache line ${element.index}`, err);
//                 }
//             }
//         } catch (err) {
//             console.warn('❌ Failed Hume TTS batch', err);
//             for (const line of batch) {
//                 failedIndexes.push(line.index);
//                 withTTS.push(line);
//             }
//         }
//     }

//     return [withTTS.sort((a, b) => a.index - b.index), failedIndexes];
// };

// const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const hydrated: ScriptElement[] = [];
//     const failedIndexes: number[] = [];

//     const linesToBatch: { line: ScriptElement; ttsCacheKey: string; voiceId: string }[] = [];

//     // First pass: try loading from cache
//     for (const element of script) {
//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             const voiceId = element.gender === 'male'
//                 ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
//                 : element.gender === 'female'
//                     ? '5bbc32c1-a1f6-44e8-bedb-9870f23619e2'
//                     : '5bbc32c1-a1f6-44e8-bedb-9870f23619e2';

//             try {
//                 const cached = await get(ttsCacheKey);
//                 if (cached) {
//                     const url = URL.createObjectURL(cached);
//                     hydrated.push({ ...element, ttsUrl: url });
//                 } else {
//                     linesToBatch.push({ line: element, ttsCacheKey, voiceId });
//                 }
//             } catch (err) {
//                 console.warn(`⚠️ Cache read error for line ${element.index}`, err);
//                 linesToBatch.push({ line: element, ttsCacheKey, voiceId });
//             }
//         } else {
//             hydrated.push(element);
//         }
//     }

//     // Regenerate any missing lines in batches
//     const batches = createHumeBatches(linesToBatch.map(({ line }) => line));

//     for (const batch of batches) {
//         const payload = batch.map((line) => {
//             const original = linesToBatch.find((item) => item.line.index === line.index);
//             return {
//                 text: line.text,
//                 description: line.actingInstructions || undefined,
//                 voiceId: original?.voiceId!,
//             };
//         });

//         try {
//             const blobs = await useHumeTTSBatch(payload);

//             for (let i = 0; i < batch.length; i++) {
//                 const element = batch[i];
//                 const blob = blobs[i];

//                 if (!blob) {
//                     failedIndexes.push(element.index);
//                     hydrated.push(element);
//                     continue;
//                 }

//                 const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//                 const url = URL.createObjectURL(blob);
//                 hydrated.push({ ...element, ttsUrl: url });

//                 try {
//                     await set(ttsCacheKey, blob);
//                 } catch (err) {
//                     console.warn(`⚠️ Failed to cache blob for line ${element.index}`, err);
//                 }
//             }
//         } catch (err) {
//             console.warn('❌ Failed Hume TTS batch during hydration:', err);
//             for (const line of batch) {
//                 failedIndexes.push(line.index);
//                 hydrated.push(line);
//             }
//         }
//     }

//     return [hydrated.sort((a, b) => a.index - b.index), failedIndexes];
// };

// 11labs -- Limited to 1 request at a time
// const addTTS = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const failedIndexes: number[] = [];
//     const withTTS: ScriptElement[] = [];

//     for (const element of script) {
//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;

//             try {
//                 const cachedAudio = await get(ttsCacheKey);

//                 if (cachedAudio) {
//                     const url = URL.createObjectURL(cachedAudio);
//                     withTTS.push({ ...element, ttsUrl: url });
//                     continue;
//                 }

//                 const voiceId =
//                     element.gender === 'male'
//                         ? 'FIsP50cHv9JY47BkNVR7'
//                         : '56AoDkrOh6qfVPDXZ7Pt'

//                 const blob = await useElevenTTS({
//                     text: element.text,
//                     voiceId,
//                     voiceSettings: {
//                         stability: 0.1,
//                         similarityBoost: 0.7,
//                     }
//                 });

//                 // Try storing the blob
//                 try {
//                     await set(ttsCacheKey, blob);
//                 } catch (setErr) {
//                     console.warn(`⚠️ Failed to store TTS blob in IndexedDB for line ${element.index}`, setErr);
//                 }

//                 const url = URL.createObjectURL(blob);
//                 withTTS.push({ ...element, ttsUrl: url });

//                 // Optional throttle
//                 await new Promise((res) => setTimeout(res, 100));
//             } catch (err) {
//                 console.warn(`⚠️ Failed to preload TTS for line ${element.index}`, err);
//                 failedIndexes.push(element.index);
//                 withTTS.push(element); // push original element without ttsUrl
//             }
//         } else {
//             withTTS.push(element);
//         }
//     }

//     return [withTTS, failedIndexes];
// };

// const hydrateTTSUrls = async (script: ScriptElement[]): Promise<[ScriptElement[], number[]]> => {
//     const hydrated: ScriptElement[] = [];
//     const failedIndexes: number[] = [];

//     for (const element of script) {
//         if (element.type === 'line' && element.role === 'scene-partner') {
//             const ttsCacheKey = `tts:${userID}:${scriptID}:${element.index}`;
//             try {
//                 let blob: Blob | undefined;

//                 // Try to load cached blob
//                 try {
//                     blob = await get(ttsCacheKey);
//                 } catch (getErr) {
//                     console.warn(`⚠️ Failed to read from IndexedDB for line ${element.index}`, getErr);
//                 }

//                 // If no blob, regenerate
//                 if (!blob) {
//                     console.warn(`💡 TTS blob missing for line ${element.index}, regenerating...`);

//                     const voiceId =
//                         element.gender === 'male'
//                             ? 'FIsP50cHv9JY47BkNVR7'
//                             : '56AoDkrOh6qfVPDXZ7Pt'

//                     blob = await useElevenTTS({
//                         text: element.text,
//                         voiceId,
//                         voiceSettings: {
//                             stability: 0.1,
//                             similarityBoost: 0.7,
//                         }
//                     });

//                     // Try to cache regenerated blob
//                     try {
//                         await set(ttsCacheKey, blob);
//                     } catch (setErr) {
//                         console.warn(`⚠️ Failed to store blob to IndexedDB for line ${element.index}`, setErr);
//                         // Proceed without storage — we still have the blob
//                     }
//                 }

//                 const url = URL.createObjectURL(blob);
//                 hydrated.push({ ...element, ttsUrl: url });
//             } catch (err) {
//                 console.warn(`❌ Failed to hydrate or regenerate TTS for line ${element.index}`, err);
//                 failedIndexes.push(element.index);
//                 hydrated.push(element); // fallback to line without ttsUrl
//             }
//         } else {
//             hydrated.push(element);
//         }
//     }

//     return [hydrated, failedIndexes];
// };