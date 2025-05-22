import dedent from 'dedent';
import { z } from 'zod';

import { getChatCompletion } from '@/infrastructure/ai';
import { withCache } from '@/infrastructure/redis';
import { ColorStackError } from '@/shared/errors';

// Constants

const APIFY_ACTOR_ID = 'apimaestro~linkedin-profile-detail';
const APIFY_API_TOKEN = process.env.APIFY_API_TOKEN as string;

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
