import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

export async function parseWithClaude(scriptText: string) {
    const prompt = `
Parse the script into JSON. Each object must include:
- "type": "scene", "line", or "direction"
- "index": original order in script
- For "line": include "character", "gender", inferred "tone", and "lineEndKeywords"
- Focus on inferring tone accurately from context; two word description is okay

Guidelines:
- "lineEndKeywords" should contain 1-2 reliable, high-signal words from the final sentence of the line
- These words do not need to be the last 2 words in the sentence
- Choose words that reflect the meaning or emotional intent of the final thought
- Pick words that are unlikely to be skipped or altered, even if the actor paraphrases
- Avoid names, rare words, or anything that speech-to-text systems often mishear
- Do not choose words that also occur earlier in the line! Must be unique

Do not rewrite anything. Do not add commentary.

YOUR RESPONSE MUST BE:
- Pure JSON only
- No markdown code blocks
- No explanatory text
- Start with [ and end with ]
- Ready to parse with JSON.parse()

Example format:
[
  { "index": 0, "type": "scene", "text": "INT. KITCHEN – DAY" },
  { "index": 1, "type": "line", "character": "JANE", "gender", "text": "What are you doing here?", "tone": "suspicious", "lineEndKeywords": "doing", "here" },
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