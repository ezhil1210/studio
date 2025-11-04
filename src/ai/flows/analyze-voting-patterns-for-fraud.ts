'use server';
/**
 * @fileOverview This file defines a Genkit flow for analyzing voting patterns to detect potential fraud.
 *
 * It exports:
 * - `analyzeVotingPatterns`: An async function that takes voting data and returns a fraud analysis report.
 * - `VotingDataInput`: The input type for the `analyzeVotingPatterns` function, defining the structure of voting data.
 * - `FraudAnalysisOutput`: The output type for the `analyzeVotingPatterns` function, detailing the fraud analysis results.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VotingDataInputSchema = z.object({
  votingData: z.array(
    z.object({
      voterId: z.string().describe('Unique identifier for the voter.'),
      vote: z.string().describe('The encrypted vote cast by the voter.'),
      timestamp: z.string().describe('Timestamp of when the vote was cast.'),
    })
  ).describe('Array of voting data objects.'),
});
export type VotingDataInput = z.infer<typeof VotingDataInputSchema>;

const FraudAnalysisOutputSchema = z.object({
  isSuspiciousActivity: z.boolean().describe('Whether or not suspicious activity was detected.'),
  explanation: z.string().describe('Explanation of why the activity is suspicious.'),
  flaggedVoterIds: z.array(z.string()).describe('Array of voter IDs that are flagged for suspicious activity.'),
});
export type FraudAnalysisOutput = z.infer<typeof FraudAnalysisOutputSchema>;

export async function analyzeVotingPatterns(input: VotingDataInput): Promise<FraudAnalysisOutput> {
  return analyzeVotingPatternsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeVotingPatternsPrompt',
  input: {schema: VotingDataInputSchema},
  output: {schema: FraudAnalysisOutputSchema},
  prompt: `You are an AI expert in fraud detection, specializing in analyzing voting patterns to identify suspicious activity.

  Analyze the following voting data to detect anomalies and potential fraud. Provide a detailed explanation of your analysis, indicating any suspicious patterns and specific voter IDs that are flagged for further investigation. Reasoning should be included to avoid false positives, and patterns such as coordinated voting, unusual timing, or other statistical anomalies should be taken into account. Always determine whether or not the activity is suspicious and set the isSuspiciousActivity boolean accordingly.

  Voting Data:
  {{#each votingData}}
  - Voter ID: {{{voterId}}}, Vote: {{{vote}}}, Timestamp: {{{timestamp}}}
  {{/each}}
  `,
});

const analyzeVotingPatternsFlow = ai.defineFlow(
  {
    name: 'analyzeVotingPatternsFlow',
    inputSchema: VotingDataInputSchema,
    outputSchema: FraudAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
