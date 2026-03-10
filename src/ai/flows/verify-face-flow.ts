
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
        })
    },
    prompt: `You are an identity verification assistant. Look closely at these two photographs and decide if they show the same individual.
    
    Photo 1 (Registered at Signup): {{media url=registeredImage}}
    Photo 2 (Live Capture at Login): {{media url=capturedFaceImage}}
    
    Determine if there is a high degree of certainty that these depict the same person.
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

    if (!output) {
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
