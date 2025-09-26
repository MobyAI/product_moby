import 'server-only';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

export async function parseWithClaude(scriptText: string) {
    const prompt = `
Parse the script into JSON. Each object must include:
- "type": "scene", "line", or "direction"
- "index": original order in script
- For "line": include "character", "gender", inferred "tone"
- Parenthetical text within a character's dialogue (e.g., "(whispers)", "(shouts)") should be kept as part of the line's text, not separated as directions
- Only treat text as "direction" type when it's a standalone stage direction between character lines (e.g., "She looks around nervously")

TONE INSTRUCTIONS:
- Up to 2 words describing HOW to deliver the line (not what/where/who)
- Keep tone CONSISTENT for a character throughout a scene unless emotion fundamentally shifts
- Focus on delivery style: "anxious whisper", "cold anger", "gentle warmth", "barely controlled"
- Same character in same scene = same tone (unless major emotional change occurs)
- Prioritize scene-level consistency over line-by-line variation
- Examples of good tones: "defensive edge", "weary resignation", "nervous energy", "quiet intensity"
- BAD: changing tone every line just because words differ
- GOOD: maintaining "playful teasing" for entire flirtatious scene

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
    { "index": 1, "type": "line", "character": "JANE", "gender": "female", "text": "Hey. (whispers) What are you doing here?", "tone": "anxious whisper" },
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