import dedent from 'dedent';
import { sql } from 'kysely';
import { z } from 'zod';

import { db } from '@oyster/db';

import { getChatCompletion } from '@/infrastructure/ai';
import { withCache } from '@/infrastructure/redis';
import { ColorStackError } from '@/shared/errors';

// Constants

const APIFY_ACTOR_ID = 'apimaestro~linkedin-profile-detail';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;

// "Get LinkedIn Profile Differential"

export async function getLinkedInProfileDifferential(memberId: string) {
  const [member, workExperiences, educations] = await Promise.all([
    db
      .selectFrom('students')
      .select([
        'currentLocation',
        'currentLocationCoordinates',
        'linkedInUrl',
        'headline',
      ])
      .where('id', '=', memberId)
      .executeTakeFirst(),

    db
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
          return sql<string>`to_char(${ref('endDate')}, 'YYYY-MM')`.as(
            'endDate'
          );
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
      .orderBy('workExperiences.startDate', 'desc')
      .orderBy('workExperiences.endDate', 'desc')
      .execute(),

    db
      .selectFrom('educations')
      .leftJoin('schools', 'schools.id', 'educations.schoolId')
      .select([
        'educations.id',
        'educations.degreeType',
        'educations.major',
        'educations.otherMajor',
        ({ ref }) => {
          return sql<string>`to_char(${ref('endDate')}, 'YYYY-MM')`.as(
            'endDate'
          );
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
      .execute(),
  ]);

  if (!member || !member.linkedInUrl) {
    return null;
  }

  console.log('work experiences', workExperiences);
  console.log('educations', educations);

  const linkedInProfile = await getLinkedInProfile(member.linkedInUrl);

  console.log('linkedInProfile', linkedInProfile);

  const SYNC_LINKEDIN_PROMPT = dedent`
    Compare the following database records with LinkedIn profile data and generate commands to synchronize them.
    Output must be valid JSON matching these types:

    type EducationCommand = {
      type: 'ADD' | 'EDIT';
      recordType: 'education';
      // For EDIT commands, include the ID of existing record and only changed fields
      id?: string;
      // Only include fields that are different from the database record
      fields: Partial<{
        degreeType: 'associate' | 'bachelors' | 'certificate' | 'doctoral' | 'masters' | 'professional';
        endDate: string | null;
        major: 'artificial_intelligence' | 'computer_science' | 'data_science' | 'electrical_or_computer_engineering' | 'information_science' | 'other';
        otherMajor: string | null;
        school: string;
        startDate: string | null;
      }>
    }

    type ExperienceCommand = {
      type: 'ADD' | 'EDIT';
      recordType: 'experience';
      // For EDIT commands, include the ID of existing record and only changed fields
      id?: string;
      // Only include fields that are different from the database record
      fields: Partial<{
        company: string;
        endDate: string | null;
        employmentType: 'apprenticeship' | 'contract' | 'freelance' | 'full_time' | 'internship' | 'part_time';
        location: string | null;
        locationType: 'hybrid' | 'in_person' | 'remote' | null;
        startDate: string | null;
        title: string;
      }>
    }

    type Command = EducationCommand | ExperienceCommand;

    Database Records:
    <database_records>
      $DATABASE_RECORDS
    </database_records>

    LinkedIn Profile:
    <linkedin_profile>
      $LINKEDIN_PROFILE
    </linkedin_profile>

    Generate an array of Command objects that will synchronize the database with LinkedIn.
    Only include commands where there are actual differences to sync.
    For EDIT commands, only include fields that have changed from the database record.
    Your output should be a single JSON array containing Command objects.
    Do not provide any explanation or text outside of the JSON array.
  `;

  const prompt = SYNC_LINKEDIN_PROMPT
    //
    .replace(
      '$DATABASE_RECORDS',
      JSON.stringify({ workExperiences, educations }, null, 2)
    )
    .replace('$LINKEDIN_PROFILE', JSON.stringify(linkedInProfile, null, 2));

  const completionResult = await getChatCompletion({
    maxTokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    system: [
      {
        type: 'text',
        text: 'You are a data comparison assistant. Output only valid JSON commands for synchronizing records.',
      },
    ],
    temperature: 0,
  });

  if (!completionResult.ok) {
    console.error(completionResult);
    throw new Error('Failed to generate LinkedIn sync commands');
  }

  let commands: any;

  try {
    commands = JSON.parse(completionResult.data);
  } catch (error) {
    console.error('Failed to parse AI response:', completionResult.data);
    throw new Error('Failed to parse LinkedIn sync commands');
  }

  // TODO: Execute the commands to sync the database
  console.log('LinkedIn Sync Commands:', commands);

  return {
    educations: linkedInProfile.educations,
    experiences: linkedInProfile.experiences,
  };
}

// "Get LinkedIn Profile Data"

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
  startDate: z.string().nullable(),
  title: z.string(),
});

const LinkedInProfile = z.object({
  /**
   * Only take into account college-level education and above. Do not include
   * high school or below.
   */
  educations: z.array(LinkedInEducation),

  /**
   * Only consider work experiences that are related to the technology industry.
   * For example, a job as a barista is not a technology experience, but an
   * experience as a software engineer, data scientists or something adjacent
   * is.
   */
  experiences: z.array(LinkedInExperience),
  headline: z.string().nullable(),
  location: z.string().nullable(),
});

type LinkedInProfile = z.infer<typeof LinkedInProfile>;

// "Get LinkedIn Profile"

export async function getLinkedInProfile(
  url: string
): Promise<LinkedInProfile> {
  async function fn() {
    const { data: run } = await runLinkedInProfileActor(url);
    const dataset = await getLinkedInProfileDataset(run.defaultDatasetId);
    const profile = await cleanLinkedInProfile(dataset);

    return profile;
  }

  return withCache(`linkedin:${url}`, 60 * 60 * 24 * 30, fn);
}

// Helpers

// "Run LinkedIn Profile Actor"

async function runLinkedInProfileActor(input: string) {
  const url = new URL(`https://api.apify.com/v2/acts/${APIFY_ACTOR_ID}/runs`);

  url.searchParams.set('token', APIFY_API_TOKEN);
  url.searchParams.set('waitForFinish', '60');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: input }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to start LinkedIn Profile run in Apify.')
      .withContext({ response: data, status: response.status })
      .report();
  }

  return data;
}

// "Get LinkedIn Profile Dataset"

const ApifyProfileData = z.object({
  basic_info: z.object({
    headline: z.string(),
    location: z.object({ full: z.string() }),
  }),
  experience: z.unknown().array(),
  education: z.unknown().array(),
});

type ApifyProfileData = z.infer<typeof ApifyProfileData>;

async function getLinkedInProfileDataset(datasetId: string) {
  const url = new URL(`https://api.apify.com/v2/datasets/${datasetId}/items`);

  url.searchParams.set('token', APIFY_API_TOKEN);

  const response = await fetch(url);

  const data = await response.json();

  if (!response.ok) {
    throw new ColorStackError()
      .withMessage('Failed to get LinkedIn Profile run from Apify.')
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
  The output must be valid JSON and match this schema exactly:

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
    startDate: z.string().nullable(),
    title: z.string(),
  });

  z.object({
    /**
     * Only take into account college-level education and above. IGNORE AND
     * REMOVE any education that is high school or below.
     */
    educations: z.array(LinkedInEducation),

    /**
     * Only consider work experiences that are related to the technology industry.
     * For example, a job as a barista is not a technology experience, but an
     * experience as a software engineer, data scientists or something adjacent
     * is.
     */
    experiences: z.array(LinkedInExperience),

    headline: z.string().nullable(),
    location: z.string().nullable(),
  });

  Here is the LinkedIn profile data to format:

  <linkedin_profile>
    $LINKEDIN_PROFILE
  </linkedin_profile>

  Your output should be a single JSON object containing these fields. Do not
  provide any explanation or text outside of the JSON object. Ensure your JSON
  is properly formatted and valid.
`;

async function cleanLinkedInProfile(
  profile: ApifyProfileData
): Promise<LinkedInProfile> {
  const prompt = LINKEDIN_PROFILE_PROMPT.replace(
    '$LINKEDIN_PROFILE',
    JSON.stringify(profile, null, 2)
  );

  const completionResult = await getChatCompletion({
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
    console.error(completionResult);
    throw new Error('Failed to format LinkedIn profile data');
  }

  let json: any;

  try {
    json = JSON.parse(completionResult.data);
  } catch (error) {
    console.error('Failed to parse AI response:', completionResult.data);
    throw new Error('Failed to parse formatted LinkedIn profile data');
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
