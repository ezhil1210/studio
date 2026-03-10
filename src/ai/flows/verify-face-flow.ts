
'use server';
/**
 * @fileOverview A flow to compare two face images using AI prompting.
 *
 * - verifyFace - A function that handles the face comparison process.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { FaceMatchInputSchema, FaceMatchOutputSchema, type FaceMatchInput, type FaceMatchOutput } from '@/lib/schemas';

const verifyFacePrompt = ai.definePrompt({
    name: 'verifyFacePrompt',
    input: {
        schema: FaceMatchInputSchema,
    },
    output: {
        schema: z.object({
            match: z.boolean().describe('True if the faces in the two images belong to the same person.'),
            confidence: z.number().describe('A score from 0 to 1 indicating the certainty of the match.'),
        })
    },
    prompt: `You are a professional identity verification agent for a high-security voting system. 
    
    You are provided with two images:
    - Photo 1 (Reference): Captured during user registration.
    - Photo 2 (Live): Captured just now during a login attempt.
    
    Analyze both images carefully. Consider facial features, structure, and proportions. 
    A "match" should only be true if you are highly confident that both images depict the EXACT SAME person.
    
    Photo 1: {{media url=registeredImage}}
    Photo 2: {{media url=capturedFaceImage}}
    
    Respond with whether they match and your confidence score.
    `,
});

const verifyFaceFlow = ai.defineFlow(
  {
    name: 'verifyFaceFlow',
    inputSchema: FaceMatchInputSchema,
    outputSchema: FaceMatchOutputSchema,
  },
  async (input) => {
    const { output } = await verifyFacePrompt(input);

    if (!output || output.confidence < 0.7) {
        return { isMatch: false };
    }

    return { isMatch: output.match };
  }
);

/**
 * Compares two images using an AI prompt to see if they depict the same person.
 * @param input Object containing the registered and live images as data URIs.
 */
export async function verifyFace(input: FaceMatchInput): Promise<FaceMatchOutput> {
    return verifyFaceFlow(input);
}
