const approvedAudioTags = new Set<string>([
    // Voice-related
    'laugh',
    'laughs',
    'laughs harder',
    'starts laughing',
    'wheezing',
    'whisper',
    'whispers',
    'sigh',
    'sighs',
    'exhales',
    'sarcastic',
    'curious',
    'excited',
    'crying',
    'snorts',
    'mischievously',
    'gasp',
    'giggles',
    'panicked',
    'tired',
    'shouting',
    'trembling',
    'serious',
    'robotically',
    'amazed',
    'pause',
    'flirty',

    // Sound Effects
    'gunshot',
    'applause',
    'clapping',
    'explosion',
    'swallows',
    'gulps',
    'door slams',
    'rainfall',
    'distant echo',
    'heartbeat',
    'thunder',

    // Unique/special
    'sings',
    'woo',
    'fart',
    'asmr mode',
    'underwater',
    'echoes'
]);

export const sanitizeForTTS = (text: string): string => {
    return text
        // Step 1: Convert parentheses to brackets
        .replace(/\(\s*([^)]+?)\s*\)/g, (match, content) => `[${content.trim()}]`)

        // Step 2: Remove bracketed text that doesn't have "tag:" prefix 
        // AND isn't in the approved audio tags list
        .replace(/\[([^\]]+)\]/g, (match, content) => {
            const trimmedContent = content.trim();

            // If it has "tag:" prefix, keep it (will be processed in step 3)
            if (/^tag:\s*/i.test(trimmedContent)) {
                return match;
            }

            // Check if it's "beat" and convert to "pause"
            if (trimmedContent.toLowerCase() === 'beat') {
                return '[pause]';
            }

            // Check if it's in the approved audio tags list
            // Convert to lowercase for case-insensitive matching
            if (approvedAudioTags.has(trimmedContent.toLowerCase())) {
                return `[${trimmedContent}]`;
            }

            // Remove the bracketed text entirely (replace with empty string)
            return '';
        })

        // Step 3: Remove "tag:" prefix from remaining bracketed text
        .replace(/\[\s*tag:\s*([^\]]+?)\s*\]/gi, (match, content) => `[${content.trim()}]`)

        // Step 4: Continue with original function steps
        // Replace one or more underscores with pause
        .replace(/_+/g, ' [pause] ')

        // Replace two or more periods with [pause]
        // .replace(/\.{2,}/g, ' [pause] ')

        // Collapse multiple spaces caused by replacements
        .replace(/\s+/g, ' ')
        .trim();
};

export const isApprovedTag = (tag: string): boolean => {
    return approvedAudioTags.has(tag.toLowerCase());
};