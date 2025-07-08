import { OpenAI } from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function parseWithGPT(scriptText: string) {
    const prompt = `
Parse the script into JSON. Each object must include:
- "type": "scene", "line", or "direction"
- "index": original order in script
- For "line": include "character" and inferred "tone"
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
  { "index": 1, "type": "line", "character": "JANE", "text": "What are you doing here?", "tone": "suspicious" },
  { "index": 2, "type": "direction", "text": "He steps back cautiously." }
]

Script:
"""${scriptText}"""
`

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: 'You are a script parsing assistant for actors. Your job is to analyze emotion and tone based on the original script.' },
            { role: 'user', content: prompt },
        ],
        temperature: 0.3,
    });

    const message = response.choices[0]?.message?.content?.trim() ?? '';
    return message;
}