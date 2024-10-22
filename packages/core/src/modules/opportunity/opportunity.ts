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
import { type ListSearchParams, type SelectExpression } from '@/shared/types';
import { fail, success } from '@/shared/utils/core.utils';
import {
  type CreateOpportunityTagInput,
  type EditOpportunityInput,
} from './opportunity.types';

// Types

type OpportunityRecord = DB['opportunities'];

// Use Case(s)

type CreateOpportunityInput = Pick<
  Insertable<OpportunityRecord>,
  'slackChannelId' | 'slackMessageId'
>;

async function createOpportunity(input: CreateOpportunityInput) {
  const slackMessage = await db
    .selectFrom('slackMessages')
    .select(['studentId', 'text'])
    .where('channelId', '=', input.slackChannelId)
    .where('id', '=', input.slackMessageId)
    .executeTakeFirst();

  if (!slackMessage || !slackMessage.text) {
    return fail({
      code: 404,
      error: 'Slack message was not found.',
    });
  }

  const hasLink = slackMessage.text.includes('http');

  if (!hasLink) {
    return fail({
      code: 400,
      error: 'This Slack message does not contain a link to an opportunity.',
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
      ${slackMessage.text}
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

  // pull tag

  const completionResult = await getChatCompletion({
    maxTokens: 250,
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

export async function createOpportunityTag(input: CreateOpportunityTagInput) {
  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('opportunityTags')
      .values({ id: input.id, name: input.name })
      .execute();
  });
}

export async function editOpportunity(id: string, input: EditOpportunityInput) {
  const result = await db.transaction().execute(async (trx) => {
    const result = await trx
      .updateTable('opportunities')
      .set({
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
    const expiresAt = aiObject.expiresAt
      ? new Date(aiObject.expiresAt)
      : undefined;

    const opportunity = await trx
      .updateTable('opportunities')
      .set({
        description: aiObject.description,
        expiresAt,
        title: aiObject.title,
      })
      .where('id', '=', opportunityId)
      .returning(['id'])
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

    const companyId = await findOrCreateCompany(trx, aiObject.company);

    if (companyId) {
      await trx
        .deleteFrom('opportunityCompanies')
        .where('opportunityId', '=', opportunityId)
        .execute();

      await trx
        .insertInto('opportunityCompanies')
        .values({ companyId, opportunityId })
        .execute();
    }

    return opportunity;
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
