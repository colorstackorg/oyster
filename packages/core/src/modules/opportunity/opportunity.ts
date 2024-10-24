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
import { ENV } from '@/shared/env';
import { type ListSearchParams, type SelectExpression } from '@/shared/types';
import { getRandomAccentColor } from '@/shared/utils/color.utils';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import {
  type CreateOpportunityTagInput,
  type EditOpportunityInput,
} from './opportunity.types';

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

// "Create Opportunity"

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

// "Refine Opportunity"

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
  5. "tags": A list of tags that fit this opportunity, maximum 10 tags. We have
     a list of existing tags in our database that are available to associate
     with this opportunity. If there are no relevant tags, create a NEW tag that
     you think we should add to the opportunity. If you create a new tag, be
     sure it is different enough from the existing tags, and use sentence
     case. Must return at least one tag. THIS IS THE MOST IMPORTANT PART OF
     THIS JOB.

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

export const RefineOpportunityInput = z.object({
  content: z.string().trim().min(1).max(10_000),
  opportunityId: z.string().trim().min(1),
});

type RefineOpportunityInput = z.infer<typeof RefineOpportunityInput>;

/**
 * Refines an opportunity by extracting structured data from the given
 * webpage content.
 *
 * The most important piece is extracting the tags w/ AI. We try our best to
 * use existing tags in our database, but if there are no relevant tags, we'll
 * create a new one.
 *
 * @param input - The content of the webpage to extract data from.
 * @returns Result indicating the success or failure of the operation.
 */
export async function refineOpportunity(
  input: RefineOpportunityInput
): Promise<Result> {
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
    const companyId = await getMostRelevantCompany(trx, data.company);

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

    // We only want to set this once so that we can evaluate the time it takes
    // from creation to refinement of an opportunity.
    await trx
      .updateTable('opportunities')
      .set({ refinedAt: new Date() })
      .where('id', '=', input.opportunityId)
      .where('refinedAt', 'is', null)
      .executeTakeFirst();

    const upsertedTags = await trx
      .insertInto('opportunityTags')
      .values(
        data.tags.map((tag) => {
          return {
            color: getRandomAccentColor(),
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
    'I added this to our opportunities board! 📌\n\n' +
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

export async function bookmarkOpportunity(
  opportunityId: string,
  memberId: string
) {
  const action = await db.transaction().execute(async (trx) => {
    const existingBookmark = await trx
      .deleteFrom('opportunityBookmarks')
      .where('opportunityId', '=', opportunityId)
      .where('studentId', '=', memberId)
      .executeTakeFirst();

    if (existingBookmark.numDeletedRows) {
      return 'deleted';
    }

    await trx
      .insertInto('opportunityBookmarks')
      .values({ opportunityId, studentId: memberId })
      .execute();

    return 'created';
  });

  if (action === 'created') {
    const opportunity = await db
      .selectFrom('opportunities')
      .select('postedBy')
      .where('id', '=', opportunityId)
      .executeTakeFirst();

    if (opportunity && opportunity.postedBy) {
      job('gamification.activity.completed', {
        opportunityBookmarkedBy: memberId,
        opportunityId,
        studentId: opportunity.postedBy,
        type: 'get_opportunity_bookmark',
      });
    }
  }

  return success({});
}

export async function createOpportunityTag(input: CreateOpportunityTagInput) {
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('opportunityTags')
      .values({ color: input.color, id: input.id, name: input.name })
      .execute();
  });
}

export async function deleteOpportunity(id: string) {
  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('opportunities').where('id', '=', id).execute();
  });

  return success({ id });
}

export async function editOpportunity(id: string, input: EditOpportunityInput) {
  const result = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    const result = await trx
      .updateTable('opportunities')
      .set({
        companyId,
        description: input.description,
        expiresAt: input.closeDate,
        title: input.title,
      })
      .where('id', '=', id)
      .executeTakeFirst();

    await trx
      .deleteFrom('opportunityTagAssociations')
      .where('opportunityId', '=', id)
      .where('tagId', 'not in', input.tags)
      .execute();

    await trx
      .insertInto('opportunityTagAssociations')
      .values(
        input.tags.map((tag) => {
          return {
            opportunityId: id,
            tagId: tag,
          };
        })
      )
      .onConflict((oc) => {
        return oc.doNothing();
      })
      .execute();

    return result;
  });

  return success(result);
}

export async function updateOpportunityWithAI(
  opportunityId: string,
  content: string
) {
  const tags = await db
    .selectFrom('opportunityTags')
    .select(['id', 'name'])
    .orderBy('name', 'asc')
    .execute();

  const prompt = dedent`
    You are tasked with extracting structured data from a webpage, which is
    likely a job posting or something similar. We have a list of tags that we
    want to associate with this opportunity. Your job is to analyze the given
    webpage and extract the most relevant tags that fit this opportunity. If
    there are no relevant tags, feel free to create a new tag that you think
    we should add to the opportunity.

    Here's the webpage you need to analyze:

    <webpage>
      ${content}
    </webpage>

    Here are the tags we have available (though you're not limited to only these):

    <tags>
      ${tags.map((tag) => tag.name).join(', ')}
    </tags>

    You need to extract the following information and format it as JSON:

    1. Company: The name of the company offering the opportunity
    2. Title: The title of the opportunity
    3. Description: A brief description, maximum 200 characters
    4. Expires At: The expiration date in YYYY-MM-DD format, or null if not
       specified.
    5. Tags: A list of tags that fit this opportunity.

    Follow these guidelines:
    - If any information is not explicitly stated in the message, use your best
      judgment to infer it or leave it as null.
    - Limit the "Description" to 500 characters, focusing on the most relevant
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
        "tags": "string[]",
        "title": "string"
      }
    </output>
  `;

  const completionResult = await getChatCompletion({
    maxTokens: 500,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  // TODO: Should validate this w/ Zod...
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let aiObject: any;

  try {
    aiObject = JSON.parse(completionResult.data);
  } catch (error) {
    return fail({
      code: 400,
      error: 'Failed to parse JSON from AI response.',
    });
  }

  const opportunity = await db.transaction().execute(async (trx) => {
    const companyId = await getMostRelevantCompany(trx, aiObject.company);

    const expiresAt = aiObject.expiresAt
      ? new Date(aiObject.expiresAt)
      : undefined;

    const opportunity = await trx
      .updateTable('opportunities')
      .set({
        companyId,
        description: aiObject.description,
        expiresAt,
        title: aiObject.title,
      })
      .where('id', '=', opportunityId)
      .returning(['id', 'slackChannelId', 'slackMessageId'])
      .executeTakeFirstOrThrow();

    const tags = await trx
      .insertInto('opportunityTags')
      .values(
        aiObject.tags.map((tag: string) => {
          return {
            id: id(),
            name: tag,
          };
        })
      )
      .onConflict((oc) => {
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
        tags.map((tag) => {
          return {
            opportunityId,
            tagId: tag.id,
          };
        })
      )
      .execute();

    return opportunity;
  });

  const message = [
    'I added this to our *Opportunities Database* in the Member Profile!',
    `<https://app.colorstack.io/opportunities/${opportunity.id}>`,
  ].join('\n\n');

  job('notification.slack.send', {
    channel: opportunity.slackChannelId,
    message,
    threadId: opportunity.slackMessageId,
    workspace: 'regular',
  });

  return success(opportunity);
}

type ListOpportunityTagsOptions<Selection> = {
  pagination: Pick<ListSearchParams, 'limit' | 'page'>;
  select: Selection[];
  where: { ids?: string[]; search?: string };
};

export async function listOpportunityTags<
  Selection extends SelectExpression<DB, 'opportunityTags'>,
>({ pagination, select, where }: ListOpportunityTagsOptions<Selection>) {
  return db
    .selectFrom('opportunityTags')
    .select(select)
    .$if(!!where.ids, (qb) => {
      return qb.where('opportunityTags.id', 'in', where.ids!);
    })
    .$if(!!where.search, (qb) => {
      return qb.where('name', 'ilike', `%${where.search}%`);
    })
    .orderBy('name', 'asc')
    .limit(pagination.limit)
    .offset((pagination.page - 1) * pagination.limit)
    .execute();
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
