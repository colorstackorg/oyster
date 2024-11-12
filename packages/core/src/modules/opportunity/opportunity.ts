import dayjs from 'dayjs';
import dedent from 'dedent';
import { sql } from 'kysely';
import { jsonBuildObject } from 'kysely/helpers/postgres';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
import { ISO8601Date } from '@oyster/types';
import { id } from '@oyster/utils';

import { OpportunityBullJob } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { getChatCompletion } from '@/modules/ai/ai';
import { getMostRelevantCompany } from '@/modules/employment/companies';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { track } from '@/modules/mixpanel';
import { ENV } from '@/shared/env';
import { getPageContent } from '@/shared/utils/browser.utils';
import {
  ACCENT_COLORS,
  type AccentColor,
  getRandomAccentColor,
} from '@/shared/utils/color.utils';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Use Case(s)

// "Bookmark Opportunity"

type BookmarkOpportunityInput = {
  memberId: string;
  opportunityId: string;
};

/**
 * Bookmarks an opportunity for a member.
 *
 * If the member already bookmarked the opportunity, this function will remove
 * the bookmark. Otherwise, it will create a new bookmark and give points to
 * the member who _posted_ the opportunity.
 *
 * @param input - The opportunity to bookmark and the member bookmarking it.
 * @returns Result indicating the success or failure of the operation.
 */
export async function bookmarkOpportunity({
  memberId,
  opportunityId,
}: BookmarkOpportunityInput): Promise<Result> {
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
      .leftJoin('companies', 'companies.id', 'opportunities.companyId')
      .select(['companies.name as companyName', 'postedBy'])
      .where('opportunities.id', '=', opportunityId)
      .executeTakeFirst();

    if (opportunity && opportunity.companyName) {
      track({
        event: 'Opportunity Bookmarked',
        properties: { Company: opportunity.companyName },
        user: memberId,
      });
    }

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

// "Create Opportunity"

type CreateOpportunityInput = {
  sendNotification?: boolean;
  slackChannelId: string;
  slackMessageId: string;
};

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
async function createOpportunity({
  sendNotification = true,
  slackChannelId,
  slackMessageId,
}: CreateOpportunityInput): Promise<Result> {
  const slackMessage = await db
    .selectFrom('slackMessages')
    .select(['studentId', 'text', 'userId as slackUserId'])
    .where('channelId', '=', slackChannelId)
    .where('id', '=', slackMessageId)
    .executeTakeFirst();

  // This might be the case if someone posts something in the opportunity
  // channel but then quickly deletes it right after.
  if (!slackMessage || !slackMessage.text) {
    return fail({
      code: 404,
      error: 'Could not create opportunity b/c Slack message was not found.',
    });
  }

  const link = getFirstLinkInMessage(slackMessage.text);

  // We're only interested in messages that contain a link to an opportunity...
  // so we'll gracefully bail if there isn't one.
  if (!link) {
    return success({});
  }

  const isLinkedInURL = link.includes('linkedin.com');

  let websiteContent = '';

  if (!isLinkedInURL) {
    websiteContent = await getPageContent(link);
  }

  const opportunity = await db
    .insertInto('opportunities')
    .values({
      createdAt: new Date(),
      description: 'N/A',
      expiresAt: dayjs().add(3, 'months').toDate(),
      id: id(),
      postedBy: slackMessage.studentId,
      slackChannelId,
      slackMessageId,
      title: 'Opportunity',
    })
    .returning(['id'])
    .onConflict((oc) => oc.doNothing())
    .executeTakeFirstOrThrow();

  // If the link is NOT a LinkedIn job posting, we'll scrape the website content
  // using puppeteer, create a new "empty" opportunity, and then refine it with
  // AI using that website content.
  if (!isLinkedInURL) {
    return refineOpportunity({
      content: websiteContent.slice(0, 10_000),
      opportunityId: opportunity.id,
    });
  }

  if (sendNotification) {
    const message =
      `Thanks for sharing an opportunity in <#${slackChannelId}> -- I added it to our <${ENV.STUDENT_PROFILE_URL}/opportunities|opportunities board>! 🙂\n\n` +
      `To generate tags and a description, please paste the opportunity's website content <${ENV.STUDENT_PROFILE_URL}/opportunities/${opportunity.id}/refine|*HERE*>.\n\n` +
      'Thanks again!';

    job('notification.slack.send', {
      channel: slackMessage.slackUserId,
      message,
      workspace: 'regular',
    });
  }

  return success(opportunity);
}

// "Create Opportunity Tag"

export const CreateOpportunityTagInput = z.object({
  // @ts-expect-error - not sure why b/c AccentColor extends `string`!
  color: z.enum(ACCENT_COLORS),
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

type CreateOpportunityTagInput = z.infer<typeof CreateOpportunityTagInput>;

/**
 * Creates a new opportunity tag. This doesn't associate the tag with any
 * opportunities, it just creates it top-level.
 *
 * If a tag with the same name (case insensitive) already exists, this function
 * will return a failure.
 *
 * @param input - The tag to create.
 * @returns Result indicating the success or failure of the operation.
 */
export async function createOpportunityTag(
  input: CreateOpportunityTagInput
): Promise<Result> {
  const existingTag = await db
    .selectFrom('opportunityTags')
    .where('name', 'ilike', input.name)
    .executeTakeFirst();

  if (existingTag) {
    return fail({
      code: 409,
      error: 'A tag with that name already exists.',
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('opportunityTags')
      .values({
        color: input.color,
        createdAt: new Date(),
        id: input.id,
        name: input.name,
      })
      .execute();
  });

  return success({});
}

// "Delete Opportunity"

type DeleteOpportunityInput = {
  memberId: string;
  opportunityId: string;
};

/**
 * Deletes an opportunity from the database, only if the given member has
 * permission to do so. The database will cascade delete any associated records
 * (ie: tags, bookmarks, etc).
 *
 * @param input - The opportunity to delete and the member deleting it.
 * @returns Result indicating the success or failure of the operation.
 */
export async function deleteOpportunity({
  memberId,
  opportunityId,
}: DeleteOpportunityInput): Promise<Result> {
  const hasPermission = await hasOpportunityWritePermission({
    memberId,
    opportunityId,
  });

  if (!hasPermission) {
    return fail({
      code: 403,
      error: 'You do not have permission to delete this opportunity.',
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('opportunities')
      .where('opportunities.id', '=', opportunityId)
      .execute();
  });

  return success({ id: opportunityId });
}

// "Edit Opportunity"

export const EditOpportunityInput = z.object({
  companyCrunchbaseId: z.string().trim().min(1),
  description: z.string().trim().min(1).max(500),
  expiresAt: ISO8601Date,
  tags: z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.split(',')),
  title: z.string().trim().min(1),
});

type EditOpportunityInput = z.infer<typeof EditOpportunityInput>;

/**
 * Edits an opportunity.
 *
 * @param opportunityId - The opportunity to edit.
 * @param input - The updated values for the opportunity.
 * @returns Result indicating the success or failure of the operation.
 */
export async function editOpportunity(
  opportunityId: string,
  input: EditOpportunityInput
): Promise<Result> {
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
        expiresAt: input.expiresAt,
        title: input.title,
      })
      .where('id', '=', opportunityId)
      .executeTakeFirst();

    await trx
      .deleteFrom('opportunityTagAssociations')
      .where('opportunityId', '=', opportunityId)
      .where('tagId', 'not in', input.tags)
      .execute();

    await trx
      .insertInto('opportunityTagAssociations')
      .values(
        input.tags.map((tagId) => {
          return {
            opportunityId,
            tagId,
          };
        })
      )
      .onConflict((oc) => oc.doNothing())
      .execute();

    return result;
  });

  return success(result);
}

// "Refine Opportunity"

const REFINE_OPPORTUNITY_SYSTEM_PROMPT = dedent`
  You are a helpful assistant that extracts structured data from a website's
  (likely a job posting) text content.
`;

// Need to help AI out by telling it the current year...Claude 3.5 doesn't
// seem to know the current date.
const CURRENT_YEAR = new Date().getFullYear();

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
     'YYYY-MM-DD' format. This should almost always be a date in the FUTURE
     (the current year is ${CURRENT_YEAR}). If the opportunity seemingly never
     "closes", set this to null.
  5. "tags": A list of tags that fit this opportunity, maximum 5 tags and
     minimum 1 tag. This is the MOST IMPORTANT FIELD. We have a list of existing
     tags in our database that are available to associate with this opportunity.
     If there are no relevant tags, create a NEW tag that you think we should
     add to the opportunity. If you create a new tag, be sure 1) it is different
     enough from the existing tags, 2) it will be useful for MANY opportunities
     and 3) use sentence case.

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
      .returning(['id', 'refinedAt', 'slackChannelId', 'slackMessageId'])
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

  // If this is the first time the opportunity has been refined, we want to send
  // a notification to the channel.
  if (!opportunity.refinedAt) {
    const message = `I added this to our <${ENV.STUDENT_PROFILE_URL}/opportunities/${opportunity.id}|opportunities board>! 📌`;

    job('notification.slack.send', {
      channel: opportunity.slackChannelId,
      message,
      threadId: opportunity.slackMessageId,
      workspace: 'regular',
    });
  }

  return success(opportunity);
}

// Helpers

/**
 * Extracts the first URL found in the Slack message.
 *
 * @param message - Slack message to extract the URL from.
 * @returns First URL found in the message or `null` if it doesn't exist.
 */
function getFirstLinkInMessage(message: string) {
  return message.match(/<(https?:\/\/[^\s|>]+)(?:\|[^>]+)?>/)?.[1];
}

// Queries

// "Get Link From Opportunity"

/**
 * Extracts the first URL found in the Slack message associated with the
 * opportunity.
 *
 * @param opportunityId - ID of the opportunity to get the link from.
 * @returns First URL of the opportunity or `null` if it doesn't exist.
 */
export async function getLinkFromOpportunity(opportunityId: string) {
  const opportunity = await db
    .selectFrom('opportunities')
    .leftJoin('slackMessages', (join) => {
      return join
        .onRef('slackMessages.channelId', '=', 'opportunities.slackChannelId')
        .onRef('slackMessages.id', '=', 'opportunities.slackMessageId');
    })
    .select('slackMessages.text')
    .where('opportunities.id', '=', opportunityId)
    .executeTakeFirst();

  if (!opportunity || !opportunity.text) {
    return null;
  }

  const link = getFirstLinkInMessage(opportunity.text);

  if (!link) {
    return null;
  }

  return link;
}

// "Get Opportunity"

export async function getOpportunity(opportunityId: string) {
  const opportunity = await db
    .selectFrom('opportunities')
    .leftJoin('companies', 'companies.id', 'opportunities.companyId')
    .select([
      'companies.name as companyName',
      'opportunities.description',
      'opportunities.title',
    ])
    .where('opportunities.id', '=', opportunityId)
    .executeTakeFirst();

  return opportunity;
}

// "Get Opportunity Details"

type GetOpportunityDetailsInput = {
  memberId: string;
  opportunityId: string;
};

export async function getOpportunityDetails({
  memberId,
  opportunityId,
}: GetOpportunityDetailsInput) {
  const opportunity = await db
    .selectFrom('opportunities')
    .leftJoin('companies', 'companies.id', 'opportunities.companyId')
    .leftJoin('students', 'students.id', 'opportunities.postedBy')
    .leftJoin('slackMessages', (join) => {
      return join
        .onRef('slackMessages.channelId', '=', 'opportunities.slackChannelId')
        .onRef('slackMessages.id', '=', 'opportunities.slackMessageId');
    })
    .select([
      'companies.crunchbaseId as companyCrunchbaseId',
      'companies.id as companyId',
      'companies.imageUrl as companyLogo',
      'companies.name as companyName',
      'opportunities.createdAt',
      'opportunities.description',
      'opportunities.expiresAt',
      'opportunities.id',
      'opportunities.title',
      'slackMessages.channelId as slackMessageChannelId',
      'slackMessages.createdAt as slackMessagePostedAt',
      'slackMessages.id as slackMessageId',
      'slackMessages.text as slackMessageText',
      'students.firstName as posterFirstName',
      'students.lastName as posterLastName',
      'students.profilePicture as posterProfilePicture',

      (eb) => {
        return eb
          .selectFrom('opportunityBookmarks')
          .whereRef('opportunityId', '=', 'opportunities.id')
          .select((eb) => eb.fn.countAll<string>().as('count'))
          .as('bookmarks');
      },

      (eb) => {
        return eb
          .exists(() => {
            return eb
              .selectFrom('opportunityBookmarks')
              .whereRef('opportunityId', '=', 'opportunities.id')
              .where('opportunityBookmarks.studentId', '=', memberId);
          })
          .as('bookmarked');
      },

      (eb) => {
        return eb
          .or([
            eb('opportunities.postedBy', '=', memberId),
            eb.exists(() => {
              return eb
                .selectFrom('admins')
                .where('admins.memberId', '=', memberId)
                .where('admins.deletedAt', 'is', null);
            }),
          ])
          .as('hasWritePermission');
      },

      (eb) => {
        return eb
          .selectFrom('opportunityTagAssociations')
          .leftJoin(
            'opportunityTags',
            'opportunityTags.id',
            'opportunityTagAssociations.tagId'
          )
          .whereRef('opportunityId', '=', 'opportunities.id')
          .select(({ fn, ref }) => {
            const object = jsonBuildObject({
              color: ref('opportunityTags.color'),
              id: ref('opportunityTags.id'),
              name: ref('opportunityTags.name'),
            });

            type TagObject = {
              color: AccentColor;
              id: string;
              name: string;
            };

            return fn
              .jsonAgg(sql`${object} order by ${ref('name')} asc`)
              .$castTo<TagObject[]>()
              .as('tags');
          })
          .as('tags');
      },
    ])
    .where('opportunities.id', '=', opportunityId)
    .executeTakeFirst();

  return opportunity;
}

// "Has Edit Permission"

type HasEditPermissionInput = {
  memberId: string;
  opportunityId: string;
};

/**
 * Checks if the given member has write (ie: create/edit/delete) permission for
 * the opportunity. Returns `true` if the member is the creator of the
 * opportunity or if the member is an admin.
 *
 * @param input - Member ID and opportunity ID.
 * @returns Whether the member has write permission for the opportunity.
 */
export async function hasOpportunityWritePermission({
  memberId,
  opportunityId,
}: HasEditPermissionInput): Promise<boolean> {
  const opportunity = await db
    .selectFrom('opportunities')
    .where('opportunities.id', '=', opportunityId)
    .where((eb) => {
      return eb.or([
        eb('opportunities.postedBy', '=', memberId),
        eb.exists(() => {
          return eb
            .selectFrom('admins')
            .where('admins.memberId', '=', memberId)
            .where('admins.deletedAt', 'is', null);
        }),
      ]);
    })
    .executeTakeFirst();

  return !!opportunity;
}

// "List Opportunity Tags"

export async function listOpportunityTags() {
  return db
    .selectFrom('opportunityTags')
    .select(['color', 'id', 'name'])
    .orderBy('name', 'asc')
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
