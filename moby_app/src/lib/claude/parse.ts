import 'server-only'
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

export async function parseWithClaude(scriptText: string) {
    const prompt = `
Parse the script into JSON. Each object must include:
- "type": "scene", "line", or "direction"
- "index": original order in script
- For "line": include "character", "gender", inferred "tone", "lineEndKeywords", and "actingInstructions"

Guidelines for "lineEndKeywords":
- Contain 2 reliable, high-signal words from the final sentence of the line; If not possible, just 1 is okay.
- These words do not need to be the last 2 words in the sentence.
- Choose words that reflect the meaning or emotional intent of the final thought.
- Pick words that are unlikely to be skipped or altered, even if the actor paraphrases.
- Avoid names, rare words, or anything that speech-to-text systems often mishear.
- Do not choose words that also occur earlier in the line! Must be unique.

Guidelines for "actingInstructions" (Must be ≤100 characters):
- Focus on the context of the moment and who the character is speaking to and why.
- Highlight audience dynamics (e.g., intimate, confrontational, persuasive, performative).
- Include subtext or intent (e.g., revealing, accusing, persuading, resisting, deflecting).
- Use emotion or tone sparingly, only when not obvious from the context or when crucial for delivery.
- Avoid generic emotion labels (like "angry" or "sad"); prefer situational phrasing (e.g., “defending herself under pressure”).
- Favor performative phrasing that helps the actor shape delivery (e.g., “trying to hold it together in front of an ex”).
- If the line is humorous, sarcastic, or teasing, append “No laughter added.”, to the actingInstructions to ensure the TTS voice avoids inserting laughter.

Do not rewrite anything. Do not add commentary.

Your JSON must be parsable by JavaScript’s JSON.parse(). To ensure this:
- Pure JSON only
- No markdown code blocks
- No explanatory text
- Start with [ and end with ]
- Ready to parse with JSON.parse()
- Escape all double quotes (") inside string values using backslashes (e.g., \"like this\")
- Do not use smart quotes (“ ” or ’). Only use straight quotes (", ')
- Do not insert unescaped newlines or line breaks inside strings
- Do not include comments, markdown, or extra formatting
- Do not use characters like em-dashes (—) or curly apostrophes (‘ ’) in any string
- Only use valid UTF-8 characters that are compatible with JSON.parse()
- If unsure, prefer simple ASCII punctuation and formatting

Example format:
[
    { "index": 0, "type": "scene", "text": "INT. KITCHEN – DAY" },
    { "index": 1, "type": "line", "character": "JANE", "gender": "female", "text": "What are you doing here?", "tone": "suspicious", "lineEndKeywords": "doing", "here", "actingInstructions": "Suspicious and guarded, confronting someone unexpectedly." },
    { "index": 2, "type": "direction", "text": "He steps back cautiously." }
]

Script:
"""${scriptText}"""
`

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 10000,
        temperature: 0,
        system: 'You are a script parsing assistant for actors.',
        messages: [
            { role: 'user', content: prompt }
        ]
    });

    const firstContent = response.content[0];
    const message = firstContent?.type === 'text' ? firstContent.text.trim() : '';
    return message;
}