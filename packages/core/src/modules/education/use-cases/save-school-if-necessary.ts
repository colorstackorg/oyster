import { type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import { runActor } from '@/modules/apify';

const STATES_MAP: Record<string, string> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  'District Of Columbia': 'DC',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Puerto Rico': 'PR',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
};

/**
 * Saves a school in the database, if it does not already exist.
 *
 * - If the `schoolName` is not provided, this function will return `null`.
 * - If the school is found in our database, it will return the ID of the
 *   existing company.
 * - If the school is not found in our database, we will scrape the school
 *   from LinkedIn and save the school in our database. Will throw an error if
 *   the school is not found in LinkedIn.
 *
 * @param trx - Database transaction to use for the operation.
 * @param schoolName - Name of the school.
 */
export async function saveSchoolIfNecessary(
  trx: Transaction<DB>,
  schoolNameOrLinkedInId: string | null | undefined
): Promise<string | null> {
  if (!schoolNameOrLinkedInId) {
    return null;
  }

  const existingSchool = await db
    .selectFrom('schools')
    .select('id')
    .where((eb) => {
      return eb.or([
        eb('name', 'ilike', schoolNameOrLinkedInId),
        eb('linkedinId', '=', schoolNameOrLinkedInId),
      ]);
    })
    .executeTakeFirst();

  if (existingSchool) {
    return existingSchool.id;
  }

  const [schoolFromLinkedIn] = await runActor({
    actorId: 'harvestapi~linkedin-company',
    body: { companies: [schoolNameOrLinkedInId] },
    schema: z.array(
      z.object({
        id: z.string(),
        locations: z
          .array(
            z.object({
              city: z.string(),
              country: z.string(),
              geographicArea: z.string(),
              postalCode: z.string(),
            })
          )
          .min(1),
        logo: z.string().url(),
        name: z.string(),
      })
    ),
  });

  if (!schoolFromLinkedIn) {
    return null;
  }

  const companyId = id();

  const location = schoolFromLinkedIn.locations[0];

  await trx
    .insertInto('schools')
    .values({
      addressCity: location.city,
      addressState:
        STATES_MAP[location.geographicArea] || location.geographicArea,
      addressZip: location.postalCode,
      logoUrl: schoolFromLinkedIn.logo,
      id: id(),
      linkedinId: schoolFromLinkedIn.id,
      name: schoolFromLinkedIn.name,
    })
    .execute();

  return companyId;
}
