import dayjs from 'dayjs';
import dedent from 'dedent';
import { type Transaction } from 'kysely';
import { type Insertable } from 'kysely';
import { match } from 'ts-pattern';

import { db, type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import { OpportunityBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { getChatCompletion } from '@/modules/ai/ai';
import { searchCrunchbaseOrganizations } from '@/modules/employment/queries/search-crunchbase-organizations';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { fail, success } from '@/shared/utils/core.utils';

// Types

type OpportunityRecord = DB['opportunities'];

// Use Case(s)

type CreateOpportunityInput = Pick<
  Insertable<OpportunityRecord>,
  'slackChannelId' | 'slackMessageId'
>;

async function createOpportunity(input: CreateOpportunityInput) {
  // w/ AI, get the title, description, type, expires at...

  const slackMessage = await db
    .selectFrom('slackMessages')
    .select(['studentId', 'text'])
    .where('channelId', '=', input.slackChannelId)
    .where('id', '=', input.slackMessageId)
    .executeTakeFirst();

  if (!slackMessage) {
    return fail({
      code: 404,
      error: 'Slack message was not found.',
    });
  }

  const prompt = dedent`
    You are tasked with extracting structured data from a Slack message in a
    tech-focused workspace. Members share opportunities for internships,
    full-time positions, events, and other programs to help them get their first
    role in tech. Your job is to analyze the given Slack message and extract
    specific information in a JSON format.

    Here's the Slack message you need to analyze:

    <slack_message>
      ${input}
    </slack_message>

    You need to extract the following information and format it as JSON:

    1. Company: The name of the company offering the opportunity
    2. Type: Categorize as either "Job", "Event", or "Other"
    3. Title: The title of the opportunity
    4. Description: A brief description, maximum 200 characters
    5. Expires At: The expiration date in YYYY-MM-DD format, or null if not
       specified.

    Follow these guidelines:
    - If any information is not explicitly stated in the message, use your best
      judgment to infer it or leave it as null.
    - For the "Type" field, categorize as "Job" for internships and full-time
      positions, "Event" for workshops or conferences, and "Other" for anything
      that doesn't clearly fit into those categories.
    - Limit the "Description" to 200 characters, focusing on the most relevant
      information.
    - If an expiration date is not provided, set "Expires At" to null.

    Your output should be a single JSON object containing these five fields. Do
    not provide any explanation or additional text outside of the JSON object.
    Ensure your JSON is properly formatted and valid.

    <output>
      {
        "company": "string",
        "description": "string | null",
        "expiresAt": "string | null",
        "type": "'job' | 'event' | 'other'",
        "title": "string"
      }
    </output>
`;

  const completionResult = await getChatCompletion({
    maxTokens: 250,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  const outputMatch = completionResult.data.match(
    /<output>([\s\S]*?)<\/output>/
  );

  if (!outputMatch) {
    return fail({
      code: 500,
      error: 'Failed to parse output from AI.',
    });
  }

  // TODO: Should validate this w/ Zod...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aiObject: any;

  try {
    aiObject = JSON.parse(outputMatch[1].trim());
  } catch (error) {
    return fail({
      code: 400,
      error: 'Failed to parse JSON from AI response.',
    });
  }

  const opportunity = await db.transaction().execute(async (trx) => {
    const opportunityId = id();

    const expiresAt = aiObject.expiresAt
      ? new Date(aiObject.expiresAt)
      : dayjs().add(3, 'months').toDate();

    const opportunity = await trx
      .insertInto('opportunities')
      .values({
        createdAt: new Date(),
        description: aiObject.description,
        expiresAt,
        id: opportunityId,
        postedBy: slackMessage.studentId,
        slackChannelId: input.slackChannelId,
        slackMessageId: input.slackMessageId,
        title: aiObject.title,
        type: aiObject.type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    const companyId = await findOrCreateCompany(trx, aiObject.company);

    if (companyId) {
      await trx
        .insertInto('opportunityCompanies')
        .values({ companyId, opportunityId })
        .execute();
    }

    return opportunity;
  });

  return success(opportunity);
}

async function findOrCreateCompany(trx: Transaction<DB>, companyName: string) {
  let companyId: string | null = null;

  const companyFromDatabase = await db
    .selectFrom('companies')
    .select(['id'])
    .where('name', 'ilike', companyName)
    .executeTakeFirst();

  if (companyFromDatabase) {
    companyId = companyFromDatabase.id;
  } else {
    const [company] = await searchCrunchbaseOrganizations(companyName);

    if (company) {
      companyId = await saveCompanyIfNecessary(trx, company.crunchbaseId);
    }
  }

  return companyId;
}

// Worker

export const opportunityWorker = registerWorker(
  'opportunity',
  OpportunityBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'opportunity.create' }, async ({ data }) => {
        const result = await createOpportunity(data);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .exhaustive();
  }
);
