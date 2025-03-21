// script.ts - Update locations for both internship and full-time offers
import dedent from 'dedent';

import { db, type DB } from '@oyster/db';

import { getChatCompletion } from '@/infrastructure/ai';
import { fail, type Result, success } from '@/shared/utils/core';

// Using the original extractLocation function from your codebase
const LOCATION_PROMPT = dedent`
  Your goal is to clean up the location input from the user.
  Here is the location input from the user:
  <location>
    $LOCATION_INPUT
  </location>
  Rules:
  - Format as "City, State".
  - The state should an abbreviation (ie: CA).
  - If the location mentions being remote, then just use "Remote".
  - If the user specifies a short-hand city, then use the full location (ie:
    SF -> San Francisco, CA, NYC -> New York, NY).
  - If the user specifies multiple locations, then use the first location.
  - ONLY return the cleaned up location, don't include any other text.
  - If you can't determine the location, then return "N/A".
`;

/**
 * Extracts the location from the user's input. Uses AI to format the location
 * into a more standard format.
 *
 * @param location - Location input from the user.
 * @returns Result indicating the success or failure of the operation.
 */
async function extractLocation(location: string): Promise<Result<string>> {
  const prompt = LOCATION_PROMPT.replace('$LOCATION_INPUT', location);
  const completionResult = await getChatCompletion({
    maxTokens: 50,
    messages: [{ role: 'user', content: prompt }],
    system: [],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  const extractedLocation = completionResult.data;

  return success(extractedLocation);
}

/**
 * Process and update locations for internship offers
 */
async function updateInternshipOfferLocations() {
  console.log('\n=== Processing internship_offers ===');

  // Fetch all internship offers
  const offers = await db
    .selectFrom('internshipOffers')
    .select(['id', 'location'])
    .where('location', 'is not', null)
    .execute();

  if (offers.length === 0) {
    console.log('No internship offers found to update.');

    return;
  }

  console.log(`Found ${offers.length} internship offers to process.`);

  // Process each offer
  for (const offer of offers) {
    console.log(
      `Processing offer ${offer.id} with location: "${offer.location}"`
    );

    // Extract proper location format using the original function
    const locationResult = await extractLocation(offer.location);

    if (!locationResult.ok) {
      console.log(
        `Error processing location for offer ${offer.id}: ${locationResult.error}`
      );
      continue;
    }

    const formattedLocation = locationResult.data;

    // Only update if the formatted location is different
    if (formattedLocation !== offer.location) {
      console.log(
        `Updating offer ${offer.id}: "${offer.location}" -> "${formattedLocation}"`
      );

      try {
        // Update the offer location
        await db
          .updateTable('internshipOffers')
          .set({
            location: formattedLocation,
            updatedAt: new Date(),
          })
          .where('id', '=', offer.id)
          .execute();

        console.log(`Successfully updated offer ${offer.id}`);
      } catch (updateError) {
        console.error(`Error updating offer ${offer.id}:`, updateError);
      }
    } else {
      console.log(
        `No change needed for offer ${offer.id}: "${offer.location}"`
      );
    }

    // Add a small delay between API calls to avoid overwhelming the service
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Process and update locations for full-time offers
 */
async function updateFullTimeOfferLocations() {
  console.log('\n=== Processing full_time_offers ===');

  // Fetch all full-time offers
  const offers = await db
    .selectFrom('fullTimeOffers')
    .select(['id', 'location'])
    .where('location', 'is not', null)
    .execute();

  if (offers.length === 0) {
    console.log('No full-time offers found to update.');

    return;
  }

  console.log(`Found ${offers.length} full-time offers to process.`);

  // Process each offer
  for (const offer of offers) {
    console.log(
      `Processing offer ${offer.id} with location: "${offer.location}"`
    );

    // Extract proper location format using the original function
    const locationResult = await extractLocation(offer.location);

    if (!locationResult.ok) {
      console.log(
        `Error processing location for offer ${offer.id}: ${locationResult.error}`
      );
      continue;
    }

    const formattedLocation = locationResult.data;

    // Only update if the formatted location is different
    if (formattedLocation !== offer.location) {
      console.log(
        `Updating offer ${offer.id}: "${offer.location}" -> "${formattedLocation}"`
      );

      try {
        // Update the offer location
        await db
          .updateTable('fullTimeOffers')
          .set({
            location: formattedLocation,
            updatedAt: new Date(),
          })
          .where('id', '=', offer.id)
          .execute();

        console.log(`Successfully updated offer ${offer.id}`);
      } catch (updateError) {
        console.error(`Error updating offer ${offer.id}:`, updateError);
      }
    } else {
      console.log(
        `No change needed for offer ${offer.id}: "${offer.location}"`
      );
    }

    // Add a small delay between API calls to avoid overwhelming the service
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function main() {
  try {
    // Process internship offers
    await updateInternshipOfferLocations();

    // Process full-time offers
    await updateFullTimeOfferLocations();

    console.log('\nLocation update process complete for all tables!');
  } catch (error) {
    console.error('Error in main process:', error);
  }
}

main();
