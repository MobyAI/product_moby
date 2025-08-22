import 'server-only'
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
});

export async function getRolesWithClaude(scriptText: string) {
    const prompt = `
- Parse the script, identify each type "line" element of the script, and return a list of all unique characters from these "lines" as an array of strings.

- Remove parentheticals like: (V.O.), (O.S.), (CONT'D)

- Please ONLY return the array of strings and no added text.

- Example format:
["Rachel", "Joey", "Chandler"]

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