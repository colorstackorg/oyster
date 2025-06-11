import dedent from 'dedent';
import { sql, type Transaction } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { type DB, db, point } from '@oyster/db';
import { id } from '@oyster/utils';

import { getChatCompletion } from '@/infrastructure/ai';
import { withCache } from '@/infrastructure/redis';
import { getMostRelevantCompany } from '@/modules/employment/companies';
import { LocationType } from '@/modules/employment/employment.types';
import {
  getAutocompletedCities,
  getCityDetails,
} from '@/modules/location/location';
import { ColorStackError } from '@/shared/errors';
import { extractZodErrorMessage } from '@/shared/utils/zod';

// Constants

const APIFY_ACTOR_ID = 'apimaestro~linkedin-profile-detail';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;

// Schemas

const LinkedInDegreeType = z.enum([
  'associate',
  'bachelors',
  'certificate',
  'doctoral',
  'masters',
  'professional',
]);

const LinkedInEmploymentType = z.enum([
  'apprenticeship',
  'contract',
  'freelance',
  'full_time',
  'internship',
  'part_time',
]);

const LinkedInLocationType = z.enum(['hybrid', 'in_person', 'remote']);

const LinkedInMajor = z.enum([
  'artificial_intelligence',
  'computer_science',
  'data_science',
  'electrical_or_computer_engineering',
  'information_science',
  'other',
]);

const LinkedInEducation = z.object({
  degreeType: LinkedInDegreeType,
  endDate: z.string().nullable(),
  major: LinkedInMajor,
  otherMajor: z.string().nullable(),
  school: z.string(),
  startDate: z.string().nullable(),
});

const LinkedInExperience = z.object({
  company: z.string(),
  endDate: z.string().nullable(),
  employmentType: LinkedInEmploymentType,
  location: z.string().nullable(),
  locationType: LinkedInLocationType.nullable(),
  startDate: z.string(),
  title: z.string(),
});

const LinkedInProfile = z.object({
  educations: z.array(LinkedInEducation),
  experiences: z.array(LinkedInExperience),
  location: z.string().nullable(),
});

type LinkedInProfile = z.infer<typeof LinkedInProfile>;

const EducationChange = z.object({
  data: LinkedInEducation.extend({ id: z.string().optional() }),
  type: z.literal('education'),
});

const ExperienceChange = z.object({
  data: LinkedInExperience.extend({ id: z.string().optional() }),
  type: z.literal('experience'),
});

const LocationChange = z.object({
  data: z.object({ location: z.string() }),
  type: z.literal('location'),
});

const Change = z.discriminatedUnion('type', [
  EducationChange,
  ExperienceChange,
  LocationChange,
]);

type Change = z.infer<typeof Change>;

// Core

/**
 * Syncs a member's LinkedIn profile history (work, education, etc.)
 * with their database record. This is a complex process which executes the
 * following steps:
 *
 * 1. Fetches the member's existing work/education history from the database.
 * 2. Fetches the member's LinkedIn profile data from Apify. This step also
 *    cleans the LinkedIn profile data to match our expected schema. This also
 *    removes any irrelevant data like high school education, service industry
 *    jobs, etc.
 * 3. Using AI, generates a list of differences between the member's LinkedIn
 *    profile data and their database record. This spits out a list of
 *    "changes" to either add or edit records in the database.
 * 4. Executes the changes to synchronize the database with the LinkedIn
 *    profile data.
 *
 * There are multiple potential failure points in this process, whether that
 * be with the LinkedIn profile scraping, the AI cleaning, the AI differential
 * generation or the database execution.
 */
export async function syncLinkedInProfile(memberId: string): Promise<void> {
  const [member, educations, workExperiences] = await db
    .transaction()
    .execute(async (trx) => {
      return Promise.all([
        getMemberForDifferential(trx, memberId),
        getEducationHistoryForDifferential(trx, memberId),
        getWorkHistoryForDifferential(trx, memberId),
      ]);
    });

  if (!member || !member.linkedInUrl) {
    return;
  }

  // Scrapes the LinkedIn profile from the member's URL.
  const linkedInProfile = await getLinkedInProfile(member.linkedInUrl);

  if (!linkedInProfile) {
    console.log(`No LinkedIn profile found for ${member.linkedInUrl}.`);

    return;
  }

  // Generates a list of changes to synchronize the database with the LinkedIn
  // profile data.
  const changes = await getProfileDifferential(
    {
      educations,
      location: member.currentLocation,
      workExperiences,
    },
    {
      educations: linkedInProfile.educations,
      location: linkedInProfile.location,
      workExperiences: linkedInProfile.experiences,
    }
  );

  console.log(
    `Found ${changes.length} changes for ${member.linkedInUrl}.`,
    changes
  );

  // Executes the changes to synchronize the database with the LinkedIn.
  await db.transaction().execute(async (trx) => {
    const promises = changes.map((change) => {
      return match(change)
        .with({ type: 'education' }, async ({ data }) => {
          return upsertEducationFromLinkedIn(trx, memberId, data);
        })
        .with({ type: 'experience' }, async ({ data }) => {
          return upsertExperienceFromLinkedIn(trx, memberId, data);
        })
        .with({ type: 'location' }, async ({ data }) => {
          return updateLocationFromLinkedIn(trx, memberId, data);
        })
        .exhaustive();
    });

    promises.push(
      trx
        .updateTable('students')
        .set({ linkedinSyncedAt: new Date() })
        .where('id', '=', memberId)
        .execute()
    );

    await Promise.all(promises);
  });
}

async function getEducationHistoryForDifferential(
  trx: Transaction<DB>,
  memberId: string
) {
  return trx
    .selectFrom('educations')
    .leftJoin('schools', 'schools.id', 'educations.schoolId')
    .select([
      'educations.id',
      'educations.degreeType',
      'educations.major',
      'educations.otherMajor',
      ({ ref }) => {
        return sql<string>`to_char(${ref('endDate')}, 'YYYY-MM')`.as('endDate');
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'YYYY-MM')`.as(
          'startDate'
        );
      },
      ({ fn }) => {
        return fn
          .coalesce('schools.name', 'educations.otherSchool')
          .as('school');
      },
    ])
    .where('studentId', '=', memberId)
    .where('educations.deletedAt', 'is', null)
    .orderBy('educations.startDate', 'desc')
    .orderBy('educations.endDate', 'desc')
    .execute();
}

async function getMemberForDifferential(
  trx: Transaction<DB>,
  memberId: string
) {
  return trx
    .selectFrom('students')
    .select(['currentLocation', 'currentLocationCoordinates', 'linkedInUrl'])
    .where('id', '=', memberId)
    .executeTakeFirst();
}

async function getWorkHistoryForDifferential(
  trx: Transaction<DB>,
  memberId: string
) {
  return trx
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'workExperiences.employmentType',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationState',
      'workExperiences.locationType',
      'workExperiences.title',
      ({ ref }) => {
        return sql<string>`to_char(${ref('endDate')}, 'YYYY-MM')`.as('endDate');
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'YYYY-MM')`.as(
          'startDate'
        );
      },
      ({ fn }) => {
        return fn
          .coalesce('companies.name', 'workExperiences.companyName')
          .as('company');
      },
    ])
    .where('studentId', '=', memberId)
    .where('workExperiences.deletedAt', 'is', null)
    .orderBy('workExperiences.endDate', 'desc')
    .orderBy('workExperiences.startDate', 'desc')
    .execute();
}

/**
 * Gets the LinkedIn profile data for a given LinkedIn profile URL. This
 * function composes other functions to get the LinkedIn profile data:
 *
 * 1. Starts a LinkedIn Profile scraper run in Apify and gets the dataset ID.
 * 2. Uses the dataset ID to get the actual LinkedIn data.
 * 3. Cleans the LinkedIn data with AI.
 * 4. Caches the LinkedIn data for 30 days.
 *
 * Note that the LinkedIn data is cached for 30 days. This is because the
 * LinkedIn Profile scraper run in Apify is rate limited costs roughly $0.05
 * per run and LinkedIn data isn't updated that often.
 *
 * @param url - LinkedIn profile URL to scrape.
 * @returns Promise resolving to the LinkedIn profile data.
 */
async function getLinkedInProfile(
  url: string
): Promise<LinkedInProfile | null> {
  return withCache(`linkedin:${url}`, 60 * 60 * 24 * 30, async function fn() {
    try {
      const datasetId = await startLinkedInProfileScraper(url);
      const dataset = await getLinkedInProfileDataset(datasetId);
      const profile = await transformProfileData(dataset);

      return profile;
    } catch (e) {
      // There's a lot that can go wrong with the LinkedIn profile scraper, for
      // example the user's profile is private or they inputted a bad URL. We
      // don't necessarily want to fail the entire sync process for that, so
      // we'll just exit gracefully.
      return null;
    }
  });
}

const StartScraperResponse = z.object({
  data: z.object({
    defaultDatasetId: z.string(),
  }),
});

/**
 * Starts a LinkedIn Profile scraper run in Apify. This function does not return
 * the LinkedIn data. We wait for the run to finish and then get the dataset ID,
 * which we'll use in another function to get the actual LinkedIn data.
 *
 * @param input - LinkedIn profile URL to scrape.
 * @returns Promise resolving to the start result.
 */
async function startLinkedInProfileScraper(username: string): Promise<string> {
  const url = new URL(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs`);

  url.searchParams.set('token', APIFY_API_TOKEN);
  url.searchParams.set('waitForFinish', '60');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to start LinkedIn Profile run in Apify.')
      .withContext({ data, status: response.status })
      .report();
  }

  const startResult = StartScraperResponse.safeParse(data);

  if (!startResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn Profile run from Apify.')
      .withContext({
        data,
        error: extractZodErrorMessage(startResult.error),
      })
      .report();
  }

  const { defaultDatasetId } = startResult.data.data;

  return defaultDatasetId;
}

const ApifyProfileData = z.object({
  basic_info: z.object({
    location: z.object({ full: z.string() }),
  }),
  experience: z.unknown().array(),
  education: z.unknown().array(),
});

type ApifyProfileData = z.infer<typeof ApifyProfileData>;

/**
 * Gets the LinkedIn profile dataset from Apify. This function uses the dataset
 * ID from the start run to get the actual LinkedIn data.
 *
 * @param datasetId - Dataset ID to get the LinkedIn profile data for.
 * @returns Promise resolving to the LinkedIn profile data.
 */
async function getLinkedInProfileDataset(datasetId: string) {
  const url = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);

  url.searchParams.set('token', APIFY_API_TOKEN);

  const response = await fetch(url);

  const data = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to get LinkedIn Profile dataset from Apify.')
      .withContext({ response: data, status: response.status })
      .report();
  }

  const apifyResult = ApifyProfileData.safeParse(data[0]);

  if (!apifyResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn Profile from Apify.')
      .withContext({ data, error: extractZodErrorMessage(apifyResult.error) })
      .report();
  }

  return apifyResult.data;
}

// "Clean LinkedIn Profile"

const TRANSFORM_LINKEDIN_PROFILE_PROMPT = dedent`
  You are given raw LinkedIn profile data. Your task is to extract and transform
  it into a JSON object that strictly adheres to the schema defined below. Your
  output **must be valid JSON**, match the schema **exactly**, and include
  **no extra text**—only the JSON.

  ---

  Schema:

  const LinkedInEducation = z.object({
    degreeType: z.enum([
      'associate',
      'bachelors',
      'certificate',
      'doctoral',
      'masters',
      'professional',
    ]),
    endDate: z.string().nullable(),
    major: z.enum([
      'artificial_intelligence',
      'computer_science',
      'data_science',
      'electrical_or_computer_engineering',
      'information_science',
      'other',
    ]),
    otherMajor: z.string().nullable(),
    school: z.string(),
    startDate: z.string().nullable(),
  });

  const LinkedInExperience = z.object({
    company: z.string(),
    endDate: z.string().nullable(),
    employmentType: z.enum([
      'apprenticeship',
      'contract',
      'freelance',
      'full_time',
      'internship',
      'part_time',
    ]),
    location: z.string().nullable(),
    locationType: z.enum(['hybrid', 'in_person', 'remote']).nullable(),
    startDate: z.string(),
    title: z.string(),
  });

  const OutputSchema = z.object({
    educations: z.array(LinkedInEducation),
    experiences: z.array(LinkedInExperience),
    location: z.string().nullable(),
  });

  ---

  Instructions:

  1. Output must be a single valid JSON object matching "OutputSchema".
  2. Do not include high school or lower education. Only include college-level
     and above.
  3. Exclude non-professional work (e.g., server, cashier). Include relevant
     professional experience (e.g., founder).
  4. If both "location" and "locationType" are null for an experience, default
     "locationType" to "remote".
  5. Normalize all dates as follows:
    - Format: "YYYY-MM-DD"
    - If only year and month → use "YYYY-MM-01"
    - If only year:
      - Education start → "YYYY-08-01"
      - Education end → "YYYY-05-01"
      - Experience start → "YYYY-01-01"
      - Experience end → "YYYY-12-01"
  6. Normalize metro-area LinkedIn locations to city/state as follows:
    - "San Francisco Bay Area" → "San Francisco, CA"
    - "New York City Metropolitan Area" → "New York, NY"
    - "Greater Los Angeles Area" → "Los Angeles, CA"
    - "Greater Seattle Area" → "Seattle, WA"
    - "Houston, Texas Area" → "Houston, TX"
    - "Greater Boston Area" → "Boston, MA"
    - "Chicago Metropolitan Area" → "Chicago, IL"
  7. For education majors not listed in the enum, set "major" to "other" and
     populate "otherMajor" with the raw major.

  ---

  Example:

  Input:
  """
  Education:
  - Degree: Bachelors
    Major: Computer Science
    School: MIT
    Start: 2015
    End: 2019

  Experience:
  - Title: Software Engineer
    Company: Google
    Start: 2020-03
    End: Present
    Employment Type: Full-time
    Location: San Francisco Bay Area
    Location Type: Hybrid

  Location: Greater Boston Area
  """

  Output:
  {
    "educations": [
      {
        "degreeType": "bachelors",
        "endDate": "2019-05-01",
        "major": "computer_science",
        "otherMajor": null,
        "school": "MIT",
        "startDate": "2015-08-01"
      }
    ],
    "experiences": [
      {
        "company": "Google",
        "endDate": null,
        "employmentType": "full_time",
        "location": "San Francisco, CA",
        "locationType": "hybrid",
        "startDate": "2020-03-01",
        "title": "Software Engineer"
      }
    ],
    "location": "Boston, MA"
  }
`;

/**
 * Transforms the LinkedIn profile data from Apify into a specific JSON
 * structure. We use AI to follow the schema instructions exactly. We
 * validate the output with Zod.
 *
 * @param profile - LinkedIn profile data from Apify.
 * @returns Promise resolving to the cleaned LinkedIn profile data.
 */
async function transformProfileData(
  profile: ApifyProfileData
): Promise<LinkedInProfile> {
  const completionResult = await getChatCompletion({
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1000,
    messages: [
      {
        role: 'user',
        content: dedent`
          <linkedin_profile>
            ${JSON.stringify(profile, null, 2)}
          </linkedin_profile>
        `,
      },
    ],
    system: [
      {
        type: 'text',
        text: 'You are a data transformation assistant. Output only valid JSON matching the specified schema exactly.',
      },
      { type: 'text', text: TRANSFORM_LINKEDIN_PROFILE_PROMPT, cache: true },
    ],
    temperature: 0,
  });

  if (!completionResult.ok) {
    throw new ColorStackError()
      .withMessage('Failed to format LinkedIn profile data with AI.')
      .withContext({ response: completionResult.error })
      .report();
  }

  let json: any;

  try {
    json = JSON.parse(completionResult.data);
  } catch (error) {
    throw new ColorStackError()
      .withMessage('Failed to parse AI response into JSON.')
      .withContext({ error, response: completionResult.data })
      .report();
  }

  const profileResult = LinkedInProfile.safeParse(json);

  if (!profileResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn Profile from AI.')
      .withContext({ error: profileResult.error, response: json })
      .report();
  }

  return profileResult.data;
}

const LINKEDIN_DIFFERENTIAL_ROLE = dedent`
  You are an expert at comparing JSON records. You understand the nuances of the
  data and can determine when changes are needed.
`;

const LINKEDIN_DIFFERENTIAL_PROMPT = dedent`
  <context>
    Users can manually enter their work history, education, and location, but
    this data often already exists on LinkedIn. This tool syncs LinkedIn profiles
    to in-app database profiles.
  </context>

  <goal>
    Generate a list of changes to update the user's database profile based on
    their inkedIn profile.

    🔁 One-way sync: **LinkedIn → Database**
    - Add records present in LinkedIn but missing in the database.
    - Update records if LinkedIn has newer or different data.

    ⚠️ Do **not** generate changes for database records missing from LinkedIn.
    Only LinkedIn data should drive updates.
  </goal>

  <types>
    type EducationChange = {
      type: 'education';
      reason: string;
      data: {
        degreeType: 'associate' | 'bachelors' | 'certificate' | 'doctoral' |
          'masters' | 'professional';
        endDate: string | null;
        major: 'artificial_intelligence' | 'computer_science' | 'data_science' |
          'electrical_or_computer_engineering' | 'information_science' | 'other';
        otherMajor: string | null;
        school: string;
        startDate: string | null;
        id?: string;
      };
    }

    type ExperienceChange = {
      type: 'experience';
      reason: string;
      data: {
        company: string;
        endDate: string | null;
        employmentType: 'apprenticeship' | 'contract' | 'freelance' |
          'full_time' | 'internship' | 'part_time';
        location: string | null;
        locationType: 'hybrid' | 'in_person' | 'remote' | null;
        startDate: string | null;
        title: string;
        id?: string;
      };
    }

    type LocationChange = {
      type: 'location';
      reason: string;
      data: {
        location: string;
      };
    }

    type Change = EducationChange | ExperienceChange | LocationChange;

    Change[] // Output format
  </types>

  <rules>
    - Sync is LinkedIn → Database only.
    - Ignore database-only data.
    - Each change must include a clear, concise "reason".

    **Date normalization:**
    - Format: "YYYY-MM-DD"
    - If only year/month: assume first of month → "2025-01" → "2025-01-01"
    - If only year:
      - Education start: "YYYY-08-01"
      - Education end: "YYYY-05-01"
      - Experience start: "YYYY-01-01"
      - Experience end: "YYYY-12-01"
    - If LinkedIn is less precise (e.g., "2020") than the database (e.g.,
      "2020-05-01"), do **not** count as a change.

    **Location normalization:**
    - Map LinkedIn metro areas to city/state:
      - e.g., "San Francisco Bay Area" → "San Francisco, CA"
    - Normalize both LinkedIn and database locations to "City, State" before
      comparing.
    - Treat "City, State" and "City, State, Country" as equivalent locations.
      - Example: "San Diego, CA" == "San Diego, CA, USA"
    - If normalized locations match, do **not** generate a change.

    **Output:**
    - Return a **valid JSON array** of "Change" objects.
    - If no changes: return [] (no quotes or comments).
    - Do **not** include:
      - Markdown formatting (like \`\`\`json)
      - Comments or explanations
      - Text before or after the array
  </rules>
`;

type ProfileData = {
  educations: Array<object>;
  location: string | null;
  workExperiences: Array<object>;
};

/**
 * Gets the differential between the LinkedIn profile and the database profile.
 * The result of this function is a list of changes that when executed, will
 * synchronize the database with the LinkedIn profile data.
 *
 * This function relies on AI to evaluate the differences between what's
 * currently in our database on what's on LinkedIn. If there are no differences,
 * then this function SHOULD return an empty array.
 *
 * @param memberId - ID of the member to get the differential for.
 * @returns Promise resolving to the list of changes to synchronize the database
 * with the LinkedIn profile data.
 */
export async function getProfileDifferential(
  currentProfile: ProfileData,
  linkedInProfile: ProfileData
): Promise<Change[]> {
  const content = dedent`
    Here is the data from the database and the LinkedIn profile:

    <database_profile>
      ${JSON.stringify(currentProfile, null, 2)}
    </database_profile>

    <linkedin_profile>
      ${JSON.stringify(linkedInProfile, null, 2)}
    </linkedin_profile>
  `;

  const completionResult = await getChatCompletion({
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1000,
    messages: [{ role: 'user', content }],
    system: [
      { type: 'text', text: LINKEDIN_DIFFERENTIAL_ROLE, cache: true },
      { type: 'text', text: LINKEDIN_DIFFERENTIAL_PROMPT, cache: true },
    ],
    temperature: 0,
  });

  if (!completionResult.ok) {
    throw new ColorStackError()
      .withMessage('Failed to generate LinkedIn sync changes.')
      .withContext({ response: completionResult.error })
      .report();
  }

  let json: any;

  try {
    json = JSON.parse(completionResult.data);
  } catch (error) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn sync changes from AI.')
      .withContext({ error, response: completionResult.data })
      .report();
  }

  const changesResult = Change.array().safeParse(json);

  if (!changesResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn sync changes from AI.')
      .withContext({ error: changesResult.error, response: json })
      .report();
  }

  return changesResult.data;
}

/**
 * Upserts an education record from LinkedIn profile data. If the education
 * already exists, it will be updated. If it does not exist, it will be created.
 *
 * @param trx - Database transaction to use for the query.
 * @param memberId - ID of the member to upsert the education for.
 * @param data - LinkedIn education data to upsert.
 */
async function upsertEducationFromLinkedIn(
  trx: Transaction<DB>,
  memberId: string,
  data: Extract<Change, { type: 'education' }>['data']
) {
  const educationId = data.id || id();
  const school = await getMostRelevantSchool(trx, data.school);

  return trx
    .insertInto('educations')
    .values({
      ...(school ? { schoolId: school.id } : { otherSchool: data.school }),
      degreeType: data.degreeType,
      endDate: data.endDate,
      id: educationId,
      major: data.major,
      otherMajor: data.otherMajor,
      startDate: data.startDate,
      studentId: memberId,
    })
    .onConflict((oc) => {
      return oc.column('id').doUpdateSet((eb) => {
        return {
          degreeType: eb.ref('excluded.degreeType'),
          endDate: eb.ref('excluded.endDate'),
          major: eb.ref('excluded.major'),
          otherMajor: eb.ref('excluded.otherMajor'),
          otherSchool: eb.ref('excluded.otherSchool'),
          startDate: eb.ref('excluded.startDate'),
          schoolId: eb.ref('excluded.schoolId'),
          updatedAt: new Date(),
        };
      });
    })
    .execute();
}

/**
 * Finds the most relevant school in the database matching a school name.
 * Uses fuzzy text matching via PostgreSQL similarity functions to find
 * closest matches.
 *
 * This is useful because LinkedIn will just have a raw school name for each
 * education, and we need to attempt to match it to our database of schools.
 *
 * @param trx - Database transaction to use for the query.
 * @param schoolName - Name of school to search for.
 * @returns Promise resolving to the ID of the most relevant matching school,
 * if found.
 */
async function getMostRelevantSchool(trx: Transaction<DB>, schoolName: string) {
  const similarity = sql`similarity(name, ${schoolName})`;
  const wordSimilarity = sql`word_similarity(name, ${schoolName})`;

  return trx
    .selectFrom('schools')
    .select('id')
    .where((eb) => {
      return eb.or([
        eb('name', 'ilike', `%${schoolName}%`),
        eb(similarity, '>', 0.5),
        eb(wordSimilarity, '>', 0.5),
      ]);
    })
    .orderBy(similarity, 'desc')
    .orderBy(wordSimilarity, 'desc')
    .limit(1)
    .executeTakeFirst();
}

/**
 * Upserts a work experience record from LinkedIn profile data. If the work
 * experience already exists, it will be updated. If it does not exist, it will
 * be created.
 *
 * @param trx - Database transaction to use for the query.
 * @param memberId - ID of the member to upsert the work experience for.
 * @param data - LinkedIn work experience data to upsert.
 */
async function upsertExperienceFromLinkedIn(
  trx: Transaction<DB>,
  memberId: string,
  data: Extract<Change, { type: 'experience' }>['data']
) {
  const workExperienceId = data.id || id();

  // `data.company` is the raw company name from LinkedIn. We need to find the
  // most relevant company in our database or using the Crunchbase API.
  const companyId = data.company
    ? await getMostRelevantCompany(trx, data.company)
    : null;

  const location = await getMostRelevantLocation(data.location);

  let locationType: LocationType;

  if (data.locationType) {
    locationType = data.locationType;
  } else if (location) {
    // If there is a location found, we'll assume it's in-person.
    locationType = LocationType.IN_PERSON;
  } else {
    // If there is no location found, we'll assume it's remote.
    locationType = LocationType.REMOTE;
  }

  return trx
    .insertInto('workExperiences')
    .values({
      ...(companyId && { companyId }),
      ...(!companyId && { companyName: data.company }),
      ...(location && {
        locationCity: location.city,
        locationState: location.state,
      }),
      employmentType: data.employmentType,
      endDate: data.endDate,
      id: workExperienceId,
      locationType,
      startDate: data.startDate,
      studentId: memberId,
      title: data.title,
    })
    .onConflict((oc) => {
      return oc.column('id').doUpdateSet(({ ref }) => {
        return {
          companyId: ref('excluded.companyId'),
          companyName: ref('excluded.companyName'),
          employmentType: ref('excluded.employmentType'),
          endDate: ref('excluded.endDate'),
          locationCity: ref('excluded.locationCity'),
          locationState: ref('excluded.locationState'),
          locationType: ref('excluded.locationType'),
          startDate: ref('excluded.startDate'),
          studentId: ref('excluded.studentId'),
          title: ref('excluded.title'),
          updatedAt: new Date(),
        };
      });
    })
    .execute();
}

/**
 * Updates a member's current location from LinkedIn profile data. We'll
 * default to their location on LinkedIn. If we can't find a match using the
 * Google Places API, we won't update anything.
 *
 * @param trx - Database transaction to use for the query.
 * @param memberId - ID of the member to update the location for.
 * @param data - LinkedIn location data to update.
 * @returns Promise resolving to the result of the update.
 */
async function updateLocationFromLinkedIn(
  trx: Transaction<DB>,
  memberId: string,
  data: Extract<Change, { type: 'location' }>['data']
) {
  const location = await getMostRelevantLocation(data.location);

  if (!location) {
    return null;
  }

  return trx
    .updateTable('students')
    .set({
      currentLocation: location.formattedAddress,
      currentLocationCoordinates: point({
        x: location.longitude,
        y: location.latitude,
      }),
    })
    .where('id', '=', memberId)
    .execute();
}

/**
 * Finds the most relevant location using the Google Places API. This function
 * uses the autocomplete endpoint to find a list of matched cities. We choose
 * the top match and then use the details endpoint to get the city, state and
 * coordinates.
 *
 * @param location - Location name to search for.
 * @returns Promise resolving to the most relevant matching location, if found.
 */
async function getMostRelevantLocation(location: string | null) {
  if (location) {
    const cities = await getAutocompletedCities(location);

    if (cities?.length) {
      const details = await getCityDetails(cities[0].id);

      if (details && details.city && details.state) {
        return details;
      }
    }
  }

  return null;
}
