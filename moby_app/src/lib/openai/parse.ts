import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function parseWithGPT(scriptText: string) {
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

Guidelines for "actingInstructions":
- Keep it short and vivid (≤100 characters).
- Combine tone, subtext, intent, and scene context.
- Make it performance-ready: emotion + delivery + audience (speaking to a crowd, intimate conversation, etc.)
- Use vivid, precise emotion words and vocal style cues (e.g., “angry and betrayed, shouted through clenched teeth” or “nervous but hopeful, speaking gently”).
- Reuse subtext/intention through framing like “pleading with...”, “accusing...”, “revealing...” etc.

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
  { "index": 1, "type": "line", "character": "JANE", "gender", "text": "What are you doing here?", "tone": "suspicious", "lineEndKeywords": "doing", "here", "actingInstructions": "Suspicious and guarded, confronting someone unexpectedly." },
  { "index": 2, "type": "direction", "text": "He steps back cautiously." }
]

Script:
"""${scriptText}"""
`

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are a script parsing assistant for actors.' },
            { role: 'user', content: prompt },
        ],
        temperature: 0.3,
    });

    const message = response.choices[0]?.message?.content?.trim() ?? '';
    return message;
}