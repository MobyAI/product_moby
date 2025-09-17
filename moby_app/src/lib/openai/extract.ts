import 'server-only';
import { OpenAI } from 'openai';
import { parseWithGPT } from './parse';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function extractScriptFromImage(base64Images: string[]) {
    // Ensure it's always an array
    const images = Array.isArray(base64Images) ? base64Images : [base64Images];
    
    // If no images provided, return empty
    if (images.length === 0) {
        return '';
    }

    const imageContents = images.map((image) => ({
        type: 'image_url' as const,
        image_url: {
            url: `data:image/png;base64,${image}`,
            detail: 'high' as const
        }
    }));

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You are a script text extractor. Extract only the actual script content, ignoring watermarks, page numbers, and any overlaid text.'
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: `
Extract the script from ${images.length === 1 ? 'this image' : 'these images'} and return a JSON object with two fields:

1. "text": The complete script text following these rules:
- Ignore any watermarks or overlaid text
- Return ONLY the raw script text in string format
- Do NOT use markdown formatting or code blocks
- Do NOT wrap the text in backticks or use plaintext
- Maintain original formatting with character names in CAPS
- Include all dialogue and stage directions as shown
- Process pages in order if multiple images

2. "characters": An array of unique character names found in the script
- Include ONLY character names that have dialogue
- Use the exact formatting from the script (usually CAPS)
- No duplicates

Return ONLY valid JSON that can be parsed with JSON.parse().
Example format:
{
    text: "INT. ROOM - DAY",
    characters: ["JOHN", "SARAH"]
}`
                    },
                    ...imageContents
                ]
            }
        ],
        temperature: 0.1, // Low temperature for accurate extraction
        max_tokens: 15000
    });

    return response.choices[0]?.message?.content?.trim() ?? '';
}

// export async function extractAndParseScript(base64Images: string[]) {
//     // Step 1: Extract text from all images
//     const extractedTexts = await Promise.all(
//         base64Images.map((image, index) =>
//             extractScriptFromImage(image)
//         )
//     );

//     // Step 2: Combine all extracted text
//     const fullScriptText = extractedTexts.join('\n\n');

//     // Step 3: Parse the combined text using your existing parser
//     const parsedScript = await parseWithGPT(fullScriptText);

//     return {
//         rawText: fullScriptText,
//         parsed: parsedScript
//     };
// }