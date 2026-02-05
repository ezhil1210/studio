
'use server';
/**
 * @fileOverview A flow to verify if two face images match.
 *
 * - verifyFace - A function that handles the face verification process.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
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
    prompt: `You are a highly accurate facial recognition system. Compare the person in the "Registered Image" with the person in the "New Image". Determine if they are the same person.

    Registered Image: {{media url=registeredImage}}
    New Image: {{media url=capturedFaceImage}}

    Only respond with whether it is a match.
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
        // If the model fails to provide an output, we should default to not matching.
        return { isMatch: false };
    }

    return { isMatch: output.match };
  }
);

/**
 * Compares two face images to see if they are a match.
 * This function is a wrapper around a Genkit flow that uses a multimodal AI model.
 * @param input An object containing the registered image and the newly captured image.
 * @returns A promise that resolves to an object indicating if the faces match.
 */
export async function verifyFace(input: FaceMatchInput): Promise<FaceMatchOutput> {
    return verifyFaceFlow(input);
}
