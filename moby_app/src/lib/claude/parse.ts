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
- For "line": include "character", "gender", inferred "tone", and "actingInstructions"
- Parenthetical text within a character's dialogue (e.g., "(beat)", "(whispers)", "(resumes normal voice)") should be kept as part of the line's text, not separated as directions
- Only treat text as "direction" type when it's a standalone stage direction between character lines (e.g., "She checks Remy's expression...")

Guidelines for "actingInstructions" (Must be ≤100 characters):
- Establish the scene context and maintain it across related lines (e.g., "confessing to new friend at bar", "defending position in courtroom")
- When the scene/setting/dynamic shifts, update the context accordingly
- Include who the character is speaking to and the relationship dynamic
- Specify the ongoing situation or conversation thread (e.g., "mid-confession about past relationship", "building to revelation")
- Include subtext or intent within that scene context
- Build on previous emotional beats when appropriate (e.g., "continuing confession, now more vulnerable")

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
    { "index": 1, "type": "line", "character": "JANE", "gender": "female", "text": "What are you doing here?", "tone": "suspicious", "actingInstructions": "Suspicious and guarded, confronting someone unexpectedly." },
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