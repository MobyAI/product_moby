import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

export async function parseWithClaude(scriptText: string) {
    const prompt = `
Parse the script into JSON. Each object must include:
- "type": "scene", "line", or "direction"
- "index": original order in script
- For "line": include "character", "gender", and inferred "tone"
- Focus on inferring tone accurately from context; two word description is okay
Do not rewrite anything.

YOUR RESPONSE MUST BE:
- Pure JSON only
- No markdown code blocks
- No explanatory text
- Start with [ and end with ]
- Ready to parse with JSON.parse()

Example format:
[
  { "index": 0, "type": "scene", "text": "INT. KITCHEN – DAY" },
  { "index": 1, "type": "line", "character": "JANE", "gender", "text": "What are you doing here?", "tone": "suspicious" },
  { "index": 2, "type": "direction", "text": "He steps back cautiously." }
]

Script:
"""${scriptText}"""
`;

    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        temperature: 0.3,
        system: 'You are a script parsing assistant for actors. Your job is to analyze emotion and tone based on the original script.',
        messages: [
            { role: 'user', content: prompt }
        ]
    });

    const firstContent = response.content[0];
    const message = firstContent?.type === 'text' ? firstContent.text.trim() : '';
    return message;
}