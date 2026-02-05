
'use server';
/**
 * @fileOverview A flow to verify a user's face against their registered image.
 *
 * - verifyFace - A function that handles the face verification process.
 * - VerifyFaceInput - The input type for the verifyFace function.
 * - VerifyFaceOutput - The return type for the verifyFace function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getFirestore as getAdminFirestore} from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import {initializeApp as initializeAdminApp, getApps as getAdminApps, App} from 'firebase-admin/app';

// Ensure admin app is initialized
function getFirebaseAdminApp(): App {
    if (getAdminApps().length) {
        return getAdminApps()[0]!;
    }
    // This will use the GOOGLE_APPLICATION_CREDENTIALS environment variable
    return initializeAdminApp();
}

export const VerifyFaceInputSchema = z.object({
  email: z.string().email().describe("The user's email address."),
  capturedFaceImage: z.string().describe("A new photo of the user's face, as a data URI."),
});
export type VerifyFaceInput = z.infer<typeof VerifyFaceInputSchema>;

export const VerifyFaceOutputSchema = z.object({
  isMatch: z.boolean().describe('Whether the new face image matches the registered one.'),
});
export type VerifyFaceOutput = z.infer<typeof VerifyFaceOutputSchema>;


const verifyFacePrompt = ai.definePrompt({
    name: 'verifyFacePrompt',
    input: {
        schema: z.object({
            registeredImage: z.string(),
            newImage: z.string(),
        }),
    },
    output: {
        schema: z.object({
            match: z.boolean().describe('True if the faces in the two images belong to the same person.'),
        })
    },
    prompt: `You are a highly accurate facial recognition system. Compare the person in the "Registered Image" with the person in the "New Image". Determine if they are the same person.

    Registered Image: {{media url=registeredImage}}
    New Image: {{media url=newImage}}

    Only respond with whether it is a match.
    `,
});

const verifyFaceFlow = ai.defineFlow(
  {
    name: 'verifyFaceFlow',
    inputSchema: VerifyFaceInputSchema,
    outputSchema: VerifyFaceOutputSchema,
  },
  async (input) => {
    const adminApp = getFirebaseAdminApp();
    const adminDb = getAdminFirestore(adminApp);
    const adminAuth = getAdminAuth(adminApp);

    const userRecord = await adminAuth.getUserByEmail(input.email);
    const voterDoc = await adminDb.collection('voters').doc(userRecord.uid).get();

    if (!voterDoc.exists() || !voterDoc.data()?.faceImage) {
        throw new Error('No registered face image found for this user.');
    }
    const registeredImage = voterDoc.data()?.faceImage;

    const { output } = await verifyFacePrompt({
        registeredImage: registeredImage,
        newImage: input.capturedFaceImage,
    });

    if (!output) {
        // If the model fails to provide an output, we should default to not matching.
        return { isMatch: false };
    }

    return { isMatch: output.match };
  }
);

export async function verifyFace(input: VerifyFaceInput): Promise<VerifyFaceOutput> {
    return verifyFaceFlow(input);
}
