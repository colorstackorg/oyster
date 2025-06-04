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

// Constants

const APIFY_ACTOR_ID = 'apimaestro~linkedin-profile-detail';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;

// Schemas

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

const LinkedInProfile = z.object({
  /**
   * Only take into account college-level education and above. Do not include
   * high school or below.
   */
  educations: z.array(LinkedInEducation),

  /**
   * Only consider professional work experiences. Filter out non-professional
   * experiences like service industry jobs (waitress, server, etc.). Keep
   * relevant professional experiences like being a founder, even if not
   * directly technical.
   */
  experiences: z.array(LinkedInExperience),
  location: z.string().nullable(),
});

type LinkedInProfile = z.infer<typeof LinkedInProfile>;

const EducationCommand = z.object({
  data: LinkedInEducation.extend({ id: z.string().optional() }),
  type: z.literal('education'),
});

const ExperienceCommand = z.object({
  data: LinkedInExperience.extend({ id: z.string().optional() }),
  type: z.literal('experience'),
});

const LocationCommand = z.object({
  data: z.object({ location: z.string() }),
  type: z.literal('location'),
});

const ChangeCommand = z.discriminatedUnion('type', [
  EducationCommand,
  ExperienceCommand,
  LocationCommand,
]);

type ChangeCommand = z.infer<typeof ChangeCommand>;

// "Sync LinkedIn Profile"

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
 *    "commands" to either add or edit records in the database.
 * 4. Executes the commands to synchronize the database with the LinkedIn
 *    profile data.
 * 5. Returns the list of commands that were executed. This is used to track
 *    the progress of the sync.
 *
 * There are multiple potential failure points in this process, whether that
 * be with the LinkedIn profile scraping, the AI cleaning, the AI differential
 * generation or the database execution.
 */
export async function syncLinkedInProfile(memberId: string): Promise<void> {
  const [member, workExperiences, educations] = await db
    .transaction()
    .execute(async (trx) => {
      return Promise.all([
        getMemberForDifferential(trx, memberId),
        getWorkHistoryForDifferential(trx, memberId),
        getEducationHistoryForDifferential(trx, memberId),
      ]);
    });

  if (!member?.linkedInUrl) {
    return;
  }

  const linkedInProfile = await getLinkedInProfile(member.linkedInUrl);

  const commands = await getLinkedInProfileDifferential(
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

  await db.transaction().execute(async (trx) => {
    const promises = commands.map((command) => {
      return match(command)
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

    await Promise.all(promises);
  });
}

const SYNC_LINKEDIN_PROMPT = dedent`
  <context>
    In our application, users can manually input their work history, education history, and current location.
    However, much of this information already exists on their LinkedIn profiles. This tool allows users to
    sync their LinkedIn profile to their in-app database profile.
  </context>

  <goal>
    Your task is to generate a list of change commands that will update the user's database profile to match
    their LinkedIn profile.

    This is a **one-way sync from LinkedIn → our database**. You should:
    - Add new records that exist in LinkedIn but not in the database.
    - Update existing database records if LinkedIn has newer or different information.

    ⚠️ IMPORTANT:
    - **If a record exists in the database but not in LinkedIn, DO NOT generate a change for it.**
    - The absence of a record on LinkedIn does **not** imply deletion or modification.

    Only data **present on LinkedIn** should be considered when generating changes.
  </goal>

  <types>
    type EducationChange = {
      type: 'education';
      reason: string; // Why is this change needed? If editing, specify what field(s) changed.
      data: {
        degreeType: 'associate' | 'bachelors' | 'certificate' | 'doctoral' | 'masters' | 'professional';
        endDate: string | null;
        major: 'artificial_intelligence' | 'computer_science' | 'data_science' | 'electrical_or_computer_engineering' | 'information_science' | 'other';
        otherMajor: string | null;
        school: string;
        startDate: string | null;
        id?: string; // Present only for edits to existing records.
      };
    }

    type ExperienceChange = {
      type: 'experience';
      reason: string; // Why is this change needed? If editing, specify what field(s) changed.
      data: {
        company: string;
        endDate: string | null;
        employmentType: 'apprenticeship' | 'contract' | 'freelance' | 'full_time' | 'internship' | 'part_time';
        location: string | null;
        locationType: 'hybrid' | 'in_person' | 'remote' | null;
        startDate: string | null;
        title: string;
        id?: string; // Present only for edits to existing records.
      };
    }

    type LocationChange = {
      type: 'location';
      reason: string; // Show both the normalized LinkedIn and database location for comparison.
      data: {
        location: string;
      }
    }

    type Change = EducationChange | ExperienceChange | LocationChange;

    Change[] // This is the output type.
  </types>

  <rules>
    - Only consider changes **from LinkedIn to the database**.
    - Ignore any data that exists in the database but not on LinkedIn.
    - For each change, include a concise and informative "reason" string.

    **Date normalization:**
    - Use the format "YYYY-MM-DD".
    - If only year and month are provided, default to the first of the month (e.g., "2025-01" → "2025-01-01").
    - If only a year is provided:
      - Education start → default to "YYYY-08-01"
      - Education end → default to "YYYY-05-01"
      - Experience start → default to "YYYY-01-01"
      - Experience end → default to "YYYY-12-01"
    - If a database date is more precise than LinkedIn (e.g., LinkedIn: "2020", database: "2020-05-01"),
      do **not** treat this as a change.

    **Location normalization rules:**
    - Normalize LinkedIn's regional or metro-area location strings to their corresponding city/state:
        - "San Francisco Bay Area" → "San Francisco, CA"
        - "New York City Metropolitan Area" → "New York, NY"
        - "Greater Los Angeles Area" → "Los Angeles, CA"
        - "Greater Seattle Area" → "Seattle, WA"
        - "Houston, Texas Area" → "Houston, TX"
        - "Greater Boston Area" → "Boston, MA"
        - "Chicago Metropolitan Area" → "Chicago, IL"
    - Normalize both the LinkedIn and database locations before comparing.
    - If the LinkedIn location, once normalized, results in the same city and state as the database location, do not generate a change — even if the original strings are different.

    **Output formatting:**
    - Output a **single valid JSON array** of change objects.
    - If there are no changes, return an empty array: []
      - Don't wrap it in quotes, just return the array.
    - Do **not** include any explanation, comments, or text outside of the JSON array.
  </rules>

  <example>
      <input>
        <database_profile>
          {
            "location": "San Francisco, CA, USA",
            "educations": [
              {
                "degreeType": "bachelors",
                "endDate": "2020-05-01",
                "id": "a",
                "major": "computer_science",
                "otherMajor": null,
                "school": "Cornell University",
                "startDate": "2016-08-01",
              },
              {
                "degreeType": "masters",
                "endDate": null,
                "id": "b",
                "major": "computer_science",
                "otherMajor": null,
                "school": "Carnegie Mellon University",
                "startDate": "2020-08-01",
              },
              {
                "degreeType": "doctoral",
                "endDate": null,
                "id": "c",
                "major": "computer_science",
                "otherMajor": null,
                "school": "Columbia University",
                "startDate": "2022-08-01",
              }
            ],
            "workExperiences": [
              {
                "company": "Two Sigma",
                "endDate": "2017-08-01",
                "employmentType": "internship",
                "id": "1",
                "locationCity": "Houston",
                "locationState": "TX",
                "locationType": "in_person",
                "startDate": "2017-05-01",
                "title": "Software Engineering Intern",
              },
              {
                "company": "Google",
                "endDate": null,
                "employmentType": "full_time",
                "id": "2",
                "locationCity": "San Francisco",
                "locationState": "CA",
                "locationType": "remote",
                "startDate": "2020-08-01",
                "title": "Software Engineer"
              }
            ]
          }
        </database_profile>
        <linkedin_profile>
          {
            "location": "San Francisco Bay Area",
            "educations": [
              {
                "degreeType": "bachelors",
                "endDate": "2020",
                "major": "computer_science",
                "otherMajor": null,
                "school": "Cornell University",
                "startDate": "2016",
              },
              {
                "degreeType": "masters",
                "endDate": "2022-05-01",
                "major": "computer_science",
                "otherMajor": null,
                "school": "Carnegie Mellon University",
                "startDate": "2020-08-01"
              }
            ],
            "workExperiences": [
              {
                "company": "Two Sigma",
                "endDate": "2017-08-01",
                "employmentType": "internship",
                "location": "Houston, Texas Area",
                "locationType": null,
                "startDate": "2017-05-01",
                "title": "Software Engineering Intern"
              },
              {
                "company": "Google",
                "endDate": null,
                "employmentType": "full_time",
                "location": "San Francisco Bay Area",
                "locationType": "remote",
                "startDate": "2020-08-01",
                "title": "Software Engineer"
              }
            ]
          }
        </linkedin_profile>
      </input>

      <output>
        [
          {
            "type": "education",
            "reason": "The end date has changed on LinkedIn.",
            "data": {
              "degreeType": "masters",
              "endDate": "2022-05-01",
              "id": "b",
              "major": "computer_science",
              "otherMajor": null,
              "school": "Carnegie Mellon University",
              "startDate": "2020-08-01"
            }
          }
        ]
      </output>

      <explanation>
        Location: The database location is a city/state (ie: "San Francisco, CA,
        USA"), but the LinkedIn location is a region/metropolitan area (ie: "San
        Francisco Bay Area"). Since this represents the same place, we don't need
        to update the location.

        Education "a": There was no need to change this record, despite that the
        LinkedIn start/end dates were years and the database start/end dates were
        months. We normalize the dates to months first and then compare them.

        Education "b": The end date has changed on LinkedIn, which is why a
        command was generated to update the end date.

        Education "c": No change generated because this data is not in the
        LinkedIn profile.

        Experience "1": The location type was null, but since we normalize a null
        location type to "in_person" when a location (city) is present, there was
        no need to update the location type. Also, since the database location
        represented the city/state that the LinkedIn location was referring to,
        there was no need to update the location. Thus, no change was needed.

        Experience "2": The database location is a city/state (ie: "San Francisco,
        CA"), but the LinkedIn location is a region/metropolitan area (ie: "San
        Francisco Bay Area"). Since this represents the same place, we don't need
        to update the location.
      </explanation>
    </example>
`;

type ProfileData = {
  educations: Array<object>;
  location: string | null;
  workExperiences: Array<object>;
};

/**
 * Gets the differential between the LinkedIn profile and the database profile.
 * The result of this function is a list of commands that when executed, will
 * synchronize the database with the LinkedIn profile data.
 *
 * This function relies on AI to evaluate the differences between what's
 * currently in our database on what's on LinkedIn. If there are no differences,
 * then this function SHOULD return an empty array.
 *
 * @param memberId - ID of the member to get the differential for.
 * @returns Promise resolving to the list of commands to synchronize the database
 * with the LinkedIn profile data.
 */
export async function getLinkedInProfileDifferential(
  currentProfile: ProfileData,
  linkedInProfile: ProfileData
): Promise<ChangeCommand[]> {
  const completionResult = await getChatCompletion({
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1000,
    messages: [
      {
        role: 'user',
        content: dedent`
          <database_profile>
            ${JSON.stringify(currentProfile, null, 2)}
          </database_profile>
          <linkedin_profile>
            ${JSON.stringify(linkedInProfile, null, 2)}
          </linkedin_profile>
      `,
      },
    ],
    system: [
      {
        type: 'text',
        text: 'You are an expert at comparing JSON records. You understand the nuances of the data and can determine when changes are needed. Output only valid JSON commands for synchronizing records from LinkedIn to our database.',
      },
      {
        type: 'text',
        text: SYNC_LINKEDIN_PROMPT,
        cache: true,
      },
    ],
    temperature: 0,
  });

  if (!completionResult.ok) {
    throw new ColorStackError()
      .withMessage('Failed to generate LinkedIn sync commands.')
      .withContext({ response: completionResult.error })
      .report();
  }

  let json: any;

  try {
    json = JSON.parse(completionResult.data);
  } catch (error) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn sync commands from AI.')
      .withContext({ error, response: completionResult.data })
      .report();
  }

  const commandsResult = ChangeCommand.array().safeParse(json);

  if (!commandsResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn sync commands from AI.')
      .withContext({ error: commandsResult.error, response: json })
      .report();
  }

  return commandsResult.data;
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
async function getLinkedInProfile(url: string): Promise<LinkedInProfile> {
  return withCache(`linkedin:${url}`, 60 * 60 * 24 * 30, async function fn() {
    const datasetId = await startLinkedInProfileScraper(url);
    const dataset = await getLinkedInProfileDataset(datasetId);
    const profile = await transformProfileData(dataset);

    return profile;
  });
}

const StartResponse = z.object({
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
      .withContext({ response: data, status: response.status })
      .report();
  }

  const startResult = StartResponse.safeParse(data);

  if (!startResult.success) {
    throw new ColorStackError()
      .withMessage('Failed to parse LinkedIn Profile run from Apify.')
      .withContext({ error: startResult.error, response: data })
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
      .withContext({ error: apifyResult.error, response: data })
      .report();
  }

  return apifyResult.data;
}

// "Clean LinkedIn Profile"

const LINKEDIN_PROFILE_PROMPT = dedent`
  Format the following LinkedIn profile data into a specific JSON structure.
  The output must be valid JSON and match this Zod schema exactly.

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
    /**
     * Only take into account college-level education and above. IGNORE AND
     * REMOVE any education that is high school or below.
     */
    educations: z.array(LinkedInEducation),

    /**
     * Only consider professional work experiences. Filter out non-professional
     * experiences like service industry jobs (waitress, server, etc.). Keep
     * relevant professional experiences like being a founder, even if not
     * directly technical.
     */
    experiences: z.array(LinkedInExperience),

    location: z.string().nullable(),
  });

  /**
   * Additional instruction:
   * - If both the LinkedIn experience's "location" and "locationType" fields are
   *   null, default the "locationType" field to "remote".
   */

  Here is the LinkedIn profile data to format:

  <linkedin_profile>
    $LINKEDIN_PROFILE
  </linkedin_profile>

  Your output should be a single JSON object containing these fields. Do not provide any explanation or text outside of the JSON object. Ensure your JSON is properly formatted and valid.
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
  const prompt = LINKEDIN_PROFILE_PROMPT
    //
    .replace('$LINKEDIN_PROFILE', JSON.stringify(profile, null, 2));

  const completionResult = await getChatCompletion({
    model: 'claude-sonnet-4-20250514',
    maxTokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    system: [
      {
        type: 'text',
        text: 'You are a data transformation assistant. Output only valid JSON matching the specified schema exactly.',
      },
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
  data: Extract<ChangeCommand, { type: 'education' }>['data']
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
  data: Extract<ChangeCommand, { type: 'experience' }>['data']
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
  data: Extract<ChangeCommand, { type: 'location' }>['data']
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
