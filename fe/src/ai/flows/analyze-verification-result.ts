
'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing verification results by calling an external API.
 *
 * - analyzeVerificationResult - A function that takes verification data and returns AI analysis details by calling a secure backend API.
 * - AnalyzeVerificationResultInput - The input type for the analyzeVerificationResult function.
 * - AnalyzeVerificationResultOutput - The return type for the analyzeVerificationResult function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeVerificationResultInputSchema = z.object({
  productName: z.string().describe('The name of the product being verified.'),
  productId: z.string().describe('The ID of the product being verified.'),
  category: z.string().describe('The category of the product.'),
  overviewImage: z
    .string()
    .describe(
      "The data URI of the overview image for the product. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  labelImage: z
    .string()
    .describe(
      "The data URI of the label image for the product. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  matchStatus: z
    .enum(['Correct', 'Incorrect', 'Uncertain'])
    .describe('The match status of the verification.'),
});

export type AnalyzeVerificationResultInput = z.infer<
  typeof AnalyzeVerificationResultInputSchema
>;

const AnalyzeVerificationResultOutputSchema = z.object({
  confidenceScore: z
    .number()
    .describe('The confidence score of the AI analysis (0-1).'),
  explanation: z.string().describe('The AI explanation of the verification result.'),
  referenceImages: z.array(z.string()).describe('URLs of reference images.'),
});

export type AnalyzeVerificationResultOutput = z.infer<
  typeof AnalyzeVerificationResultOutputSchema
>;

export async function analyzeVerificationResult(
  input: AnalyzeVerificationResultInput
): Promise<AnalyzeVerificationResultOutput> {
  return analyzeVerificationResultFlow(input);
}


const analyzeVerificationResultFlow = ai.defineFlow(
  {
    name: 'analyzeVerificationResultFlow',
    inputSchema: AnalyzeVerificationResultInputSchema,
    outputSchema: AnalyzeVerificationResultOutputSchema,
  },
  async (input) => {
    const apiEndpoint = process.env.NEXT_PUBLIC_API_ENDPOINT;
    const apiKey = process.env.API_KEY;

    if (!apiEndpoint || !apiKey || apiEndpoint.includes('your-api-gateway-id')) {
        console.error("API Endpoint or API Key is not configured correctly in environment variables.");
        throw new Error("Server configuration error: Missing or invalid API credentials.");
    }

    try {
        // I'm assuming the verification endpoint is at the path /verify
        const response = await fetch(`${apiEndpoint}/verify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`API call failed with status ${response.status}:`, errorBody);
            throw new Error(`Verification service returned an error: ${response.statusText}`);
        }

        const result: AnalyzeVerificationResultOutput = await response.json();
        return result;

    } catch (error) {
        console.error("Error calling verification API:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to communicate with the verification service: ${error.message}`);
        }
        throw new Error("An unknown error occurred while calling the verification service.");
    }
  }
);
