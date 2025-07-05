'use server';

/**
 * @fileOverview Recommendation AI agent.
 *
 * - getRecommendation - A function that handles the recommendation process.
 * - RecommendationInput - The input type for the getRecommendation function.
 * - RecommendationOutput - The return type for the getRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendationInputSchema = z.object({
  preferences: z
    .string()
    .describe('The user preferences for the venue, e.g., cuisine, ambiance, price range.'),
  availability: z
    .string()
    .describe('The availability of the venue in the selected dates and times.'),
  location: z.string().describe('The location where the user is searching for a venue.'),
  numberOfGuests: z.number().describe('The number of guests who will attend the reservation.'),
});
export type RecommendationInput = z.infer<typeof RecommendationInputSchema>;

const RecommendationOutputSchema = z.object({
  venueName: z.string().describe('The name of the recommended venue.'),
  venueType: z.string().describe('The type of the recommended venue (hotel, events, restaurant).'),
  description: z.string().describe('A short description of the recommended venue.'),
  address: z.string().describe('The address of the recommended venue.'),
  contactInformation: z.string().describe('The contact information of the recommended venue.'),
});
export type RecommendationOutput = z.infer<typeof RecommendationOutputSchema>;

export async function getRecommendation(input: RecommendationInput): Promise<RecommendationOutput> {
  return recommendationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendationPrompt',
  input: {schema: RecommendationInputSchema},
  output: {schema: RecommendationOutputSchema},
  prompt: `You are a recommendation expert specializing in recommending venues based on user preferences and availability.

You will use the following information to recommend a venue that matches the user's needs.

User Preferences: {{{preferences}}}
Availability: {{{availability}}}
Location: {{{location}}}
Number of Guests: {{{numberOfGuests}}}

Consider these options: hotel rooms, event venues, and restaurants.

Respond in the format:
Venue Name: [Venue Name]
Venue Type: [Venue Type]
Description: [Short description of the venue]
Address: [Address of the venue]
Contact Information: [Contact information of the venue]`,
});

const recommendationFlow = ai.defineFlow(
  {
    name: 'recommendationFlow',
    inputSchema: RecommendationInputSchema,
    outputSchema: RecommendationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
