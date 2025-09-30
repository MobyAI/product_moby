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

export const isApprovedTag = (tag: string): boolean => {
    return approvedAudioTags.has(tag.toLowerCase());
};

export const sanitizeForTTS = (text: string): string => {
    return text
        // Step 1: Convert parentheses to brackets
        .replace(/\(\s*([^)]+?)\s*\)/g, (match, content) => `[${content.trim()}]`)

        // Convert curly braces to brackets
        .replace(/\{\s*([^}]+?)\s*\}/g, (match, content) => `[${content.trim()}]`)

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

export const sanitizeForDialogueMode = (text: string): string => {
    return text
        // Step 1: Convert parentheses to brackets
        .replace(/\(\s*([^)]+?)\s*\)/g, (match, content) => `[${content.trim()}]`)

        // Step 2: Convert curly braces to brackets
        .replace(/\{\s*([^}]+?)\s*\}/g, (match, content) => `[${content.trim()}]`)

        // Step 3: Remove "tag: " prefix from bracketed text
        .replace(/\[\s*tag:\s*([^\]]+)\]/gi, (match, content) => `[${content.trim()}]`)

        // Step 4: Filter bracketed text - keep ONLY if in approvedAudioTags
        .replace(/\[([^\]]+)\]/g, (match, content) => {
            const trimmedContent = content.trim().toLowerCase();

            // Check if it's "beat" and convert to "pause"
            if (trimmedContent === 'beat') {
                return '[pause]';
            }

            // Check if it's in the approved audio tags list
            if (approvedAudioTags.has(trimmedContent)) {
                // Return with original casing preserved
                return `[${content.trim()}]`;
            }

            // Remove any bracketed text that's not approved
            return '';
        })

        // Step 5: Replace underscores with pause
        .replace(/_+/g, ' [pause] ')

        // Step 6: Clean up whitespace
        .replace(/\s+/g, ' ')
        .trim();
};

export const sanitizeForAlignment = (text: string): string => {
    // Remove parenthetical content (stage directions, asides)
    let cleaned = text.replace(/\([^)]*\)/g, ' ');

    // Remove bracketed content
    cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');

    // Remove curly braces content
    cleaned = cleaned.replace(/\{[^}]*\}/g, ' ');

    // Handle leading ellipsis
    cleaned = cleaned.replace(/^\.{3,}/, '');

    // Handle leading dashes
    cleaned = cleaned.replace(/^--+/, '');

    // CHANGED: Replace mid-sentence ellipsis with space (not period!)
    // "I'll... tell you" becomes "I'll tell you"
    cleaned = cleaned.replace(/(\w)\.{3,}(\s+\w)/g, '$1 $2');

    // CHANGED: Only keep ellipsis as period if it's truly at the end
    // "I was thinking..." becomes "I was thinking."
    cleaned = cleaned.replace(/\.{3,}$/g, '.');

    // CHANGED: Remove any remaining ellipsis (mid-sentence without clear context)
    cleaned = cleaned.replace(/\.{3,}/g, ' ');

    // Replace dashes with space for mid-sentence, period for end
    cleaned = cleaned.replace(/(\w)--+(\s+\w)/g, '$1 $2');  // Mid-sentence
    cleaned = cleaned.replace(/--+$/g, '.');                 // End of sentence
    cleaned = cleaned.replace(/--+/g, ' ');                  // Remaining dashes

    // Em-dash and en-dash - same treatment
    cleaned = cleaned.replace(/(\w)[—–](\s+\w)/g, '$1 $2');
    cleaned = cleaned.replace(/[—–]$/g, '.');
    cleaned = cleaned.replace(/[—–]/g, ' ');

    // Clean up any double punctuation
    cleaned = cleaned.replace(/([.!?])\s*\1+/g, '$1');

    // Ensure single space after punctuation
    cleaned = cleaned.replace(/([.!?])\s*/g, '$1 ');

    // Remove any leading/trailing punctuation except sentence enders
    cleaned = cleaned.replace(/^[^\w]+/, '');
    cleaned = cleaned.replace(/[^\w.!?]+$/, '');

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // If line is now empty or just punctuation, return empty string
    if (!/\w/.test(cleaned)) {
        return '';
    }

    // Ensure the line ends with punctuation (helps alignment)
    if (!/[.!?]$/.test(cleaned)) {
        cleaned += '.';
    }

    return cleaned;
};