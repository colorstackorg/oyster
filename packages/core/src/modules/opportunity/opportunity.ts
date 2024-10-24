import dayjs from 'dayjs';
import dedent from 'dedent';
import { type Insertable, type Transaction } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import { OpportunityBullJob } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { getChatCompletion } from '@/modules/ai/ai';
import { searchCrunchbaseOrganizations } from '@/modules/employment/queries/search-crunchbase-organizations';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { type RefineOpportunityInput } from '@/modules/opportunity/opportunity.types';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Types

type OpportunityRecord = DB['opportunities'];

// Use Case(s)

const CREATE_OPPORTUNITY_SYSTEM_PROMPT = dedent`
  You are a helpful assistant that extracts structured data from Slack messages
  in a tech-focused workspace. Members share opportunities for internships,
  full-time positions, events, and other programs to help them get their first
  role in tech. Your job is to analyze the given Slack message and extract
  specific information in a JSON format.
`;

// Create Opportunity

const CREATE_OPPORTUNITY_PROMPT = dedent`
  Here's the Slack message you need to analyze:

  <slack_message>
    $SLACK_MESSAGE
  </slack_message>

  You need to extract the following information and format it as JSON:

  1. "company": The name of the company offering the opportunity.
  2. "title": The title of the opportunity, max 75 characters.
  3. "description": A brief description of the opportunity, max 400 characters.

  Follow these guidelines:
  - If you cannot confidently infer information, set the value to null.
  - Do not include the company name in the "title" field.

  Your output should be a single JSON object containing these fields. Do not
  provide any explanation or text outside of the JSON object. Ensure your JSON
  is properly formatted and valid.

  <output>
    {
      "company": "string | null",
      "description": "string | null",
      "title": "string | null"
    }
  </output>
`;

const CreateOpportunityResponse = z.object({
  company: z.string().trim().min(1).nullable(),
  description: z.string().trim().min(1).max(500).nullable(),
  title: z.string().trim().min(1).max(100).nullable(),
});

type CreateOpportunityResponse = z.infer<typeof CreateOpportunityResponse>;

type CreateOpportunityInput = Pick<
  Insertable<OpportunityRecord>,
  'slackChannelId' | 'slackMessageId'
>;

/**
 * Creates an opportunity from a Slack message.
 *
 * If the Slack message does not contain a link to an opportunity, this function
 * will return early with a success result.
 *
 * Otherwise, we'll pass the Slack message into AI to extract the opportunity's
 * company, title, and description. Then, we'll try to find the most relevant
 * company in our database. Then, we save the opportunity in our database and
 * notify the original poster that we've added it to our opportunities board.
 *
 * @param input - Input data for creating an opportunity.
 * @returns Result indicating the success or failure of the operation.
 */
async function createOpportunity(
  input: CreateOpportunityInput
): Promise<Result> {
  const slackMessage = await db
    .selectFrom('slackMessages')
    .select(['studentId', 'text', 'userId as slackUserId'])
    .where('channelId', '=', input.slackChannelId)
    .where('id', '=', input.slackMessageId)
    .executeTakeFirst();

  // This might be the case if someone posts something in the opportunity
  // channel but then quickly deletes it right after.
  if (!slackMessage || !slackMessage.text) {
    return fail({
      code: 404,
      error: 'Could not create opportunity b/c Slack message was not found.',
    });
  }

  // We're only interested in messages that contain a link to an opportunity...
  // so we'll gracefully bail if there isn't one.
  if (!slackMessage.text.includes('http')) {
    return success({});
  }

  const prompt = CREATE_OPPORTUNITY_PROMPT.replace(
    '$SLACK_MESSAGE',
    slackMessage.text
  );

  const completionResult = await getChatCompletion({
    maxTokens: 250,
    messages: [{ role: 'user', content: prompt }],
    system: [{ type: 'text', text: CREATE_OPPORTUNITY_SYSTEM_PROMPT }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  let data: CreateOpportunityResponse;

  try {
    data = CreateOpportunityResponse.parse(JSON.parse(completionResult.data));
  } catch (error) {
    return fail({
      code: 400,
      error: 'Failed to parse or validate JSON from AI response.',
    });
  }

  const opportunity = await db.transaction().execute(async (trx) => {
    const companyId = data.company
      ? await getMostRelevantCompany(trx, data.company)
      : null;

    const opportunityId = id();

    const result = await trx
      .insertInto('opportunities')
      .values({
        companyId,
        createdAt: new Date(),
        description: data.description || 'N/A',
        expiresAt: dayjs().add(3, 'months').toDate(),
        id: opportunityId,
        postedBy: slackMessage.studentId,
        slackChannelId: input.slackChannelId,
        slackMessageId: input.slackMessageId,
        title: data.title || 'Opportunity',
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return result;
  });

  const message =
    `Thanks for sharing an opportunity in <#${input.slackChannelId}> -- I added it to our <${ENV.STUDENT_PROFILE_URL}/opportunities|opportunities board>! 🙂` +
    '\n\n' +
    `To generate tags and a description, please paste the opportunity's website content <${ENV.STUDENT_PROFILE_URL}/opportunities/${opportunity.id}/refine|*HERE*>.` +
    '\n\n' +
    'Thanks again!';

  job('notification.slack.send', {
    channel: slackMessage.slackUserId,
    message,
    workspace: 'regular',
  });

  return success(opportunity);
}

// Refine Opportunity

const REFINE_OPPORTUNITY_SYSTEM_PROMPT = dedent`
  You are a helpful assistant that extracts structured data from a website's
  (likely a job posting) text content.
`;

const REFINE_OPPORTUNITY_PROMPT = dedent`
  Your job is to analyze the given webpage and extract the following information
  and format it as JSON:

  1. "company": The name of the company offering the opportunity.
  2. "title": The title of the opportunity, max 75 characters. Do not include
     the company name in the title.
  3. "description": A brief description of the opportunity, max 400 characters.
     Extract the most relevant information including what the opportunity is,
     who it's for, when, potential compensation and any other relevant details
     to someone open to the opportunity.
  4. "expiresAt": The date that the opportunity is no longer relevant, in
     'YYYY-MM-DD' format. If the opportunity seemingly never "closes", set this
     to null.
  5. "tags": A list of tags that fit this opportunity, maximum 10 tags. If
     there are no relevant tags, create a NEW tag that you think we should add
     to the opportunity. Must return at least one tag.

  The most important part of this job is to extract the tags. We have a list
  in our database that are available to associate with this opportunity. You
  just need to determine which tags fit this opportunity best (even if it's
  not one of the existing tags).

  Here's the webpage you need to analyze:

  <website_content>
    $WEBSITE_CONTENT
  </website_content>

  Here are some existing tags in our database that you can choose from:

  <tags>
    $TAGS
  </tags>

  Follow these guidelines:
  - If you cannot confidently infer a field, set it to null.

  Your output should be a single JSON object containing these fields. Do not
  provide any explanation or text outside of the JSON object. Ensure your JSON
  is properly formatted and valid.

  <output>
    {
      "company": "string",
      "description": "string",
      "expiresAt": "string | null",
      "tags": "string[]",
      "title": "string"
    }
  </output>
`;

const RefineOpportunityResponse = z.object({
  company: z.string().trim().min(1),
  description: z.string().trim().min(1).max(500),
  expiresAt: z.string().nullable(),
  tags: z.array(z.string().trim().min(1)).min(1),
  title: z.string().trim().min(1).max(100),
});

type RefineOpportunityResponse = z.infer<typeof RefineOpportunityResponse>;

export async function refineOpportunity(input: RefineOpportunityInput) {
  const tags = await db
    .selectFrom('opportunityTags')
    .select(['id', 'name'])
    .orderBy('name', 'asc')
    .execute();

  const prompt = REFINE_OPPORTUNITY_PROMPT
    //
    .replace('$WEBSITE_CONTENT', input.content)
    .replace('$TAGS', tags.map((tag) => tag.name).join('\n'));

  const completionResult = await getChatCompletion({
    maxTokens: 500,
    messages: [{ role: 'user', content: prompt }],
    system: [{ type: 'text', text: REFINE_OPPORTUNITY_SYSTEM_PROMPT }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  let data: RefineOpportunityResponse;

  try {
    data = RefineOpportunityResponse.parse(JSON.parse(completionResult.data));
  } catch (error) {
    return fail({
      code: 400,
      error: 'Failed to parse or validate JSON from AI response.',
    });
  }

  const opportunity = await db.transaction().execute(async (trx) => {
    const companyId = data.company
      ? await getMostRelevantCompany(trx, data.company)
      : null;

    const expiresAt = data.expiresAt ? new Date(data.expiresAt) : undefined;

    const opportunity = await trx
      .updateTable('opportunities')
      .set({
        companyId,
        description: data.description,
        expiresAt,
        title: data.title,
      })
      .where('id', '=', input.opportunityId)
      .returning(['id', 'slackChannelId', 'slackMessageId'])
      .executeTakeFirstOrThrow();

    const upsertedTags = await trx
      .insertInto('opportunityTags')
      .values(
        data.tags.map((tag) => {
          return {
            color: '', // TODO: choose random color
            id: id(),
            name: tag,
          };
        })
      )
      .onConflict((oc) => {
        // Typically we would just "do nothing", but since we're returning the
        // "id", we need to update something, even if it's not actually changing
        // anything.
        return oc.column('name').doUpdateSet((eb) => {
          return {
            name: eb.ref('excluded.name'),
          };
        });
      })
      .returning(['id'])
      .execute();

    await trx
      .insertInto('opportunityTagAssociations')
      .values(
        upsertedTags.map((tag) => {
          return {
            opportunityId: opportunity.id,
            tagId: tag.id,
          };
        })
      )
      .onConflict((oc) => oc.doNothing())
      .execute();

    return opportunity;
  });

  const message =
    'I added this to our opportunities board!' +
    '\n\n' +
    `<${ENV.STUDENT_PROFILE_URL}/opportunities/${opportunity.id}>`;

  job('notification.slack.send', {
    channel: opportunity.slackChannelId,
    message,
    threadId: opportunity.slackMessageId,
    workspace: 'regular',
  });

  return success(opportunity);
}

// Helpers

/**
 * Finds the most relevant company ID based on the given name.
 *
 * If the company is already in our database, then this function will return the
 * ID of the existing company.
 *
 * Otherwise, this function will query the Crunchbase API, choose the most
 * relevant company, and save it in our database (if it's not already there).
 * Then returns the ID of the newly created company.
 *
 * @param trx - Database transaction to use for the operation.
 * @param companyName - Name of the company to find or create.
 * @returns ID of the company found or created.
 */
async function getMostRelevantCompany(
  trx: Transaction<DB>,
  companyName: string
) {
  const companyFromDatabase = await trx
    .selectFrom('companies')
    .select('id')
    .where('name', 'ilike', companyName)
    .executeTakeFirst();

  if (companyFromDatabase) {
    return companyFromDatabase.id;
  }

  const [company] = await searchCrunchbaseOrganizations(companyName);

  if (company) {
    return saveCompanyIfNecessary(trx, company.crunchbaseId);
  }

  return null;
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
