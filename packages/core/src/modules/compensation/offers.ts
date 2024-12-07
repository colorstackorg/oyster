import dedent from 'dedent';
import { type ExpressionBuilder } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, type DB } from '@oyster/db';
import { nullableField } from '@oyster/types';
import { id } from '@oyster/utils';

import { job, registerWorker } from '@/infrastructure/bull';
import { OfferBullJob } from '@/infrastructure/bull.types';
import { redis } from '@/infrastructure/redis';
import { getChatCompletion } from '@/modules/ai/ai';
import { getMostRelevantCompany } from '@/modules/employment/companies';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Types

const BaseOffer = z.object({
  additionalNotes: z.string().trim().min(1).nullable(),
  benefits: z.string().trim().min(1).nullable(),
  company: z.string().trim().min(1),
  location: z.string().trim().min(1),
  negotiated: z.string().trim().min(1).nullable(),
  pastExperience: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  role: z.string().trim().min(1),
});

const FullTimeOffer = BaseOffer.extend({
  baseSalary: z.coerce.number(),
  employmentType: z.literal('full_time'),
  performanceBonus: z.coerce.number().nullable(),
  signOnBonus: z.coerce.number().nullable(),
  totalStock: z.coerce.number().nullable(),
});

const InternshipOffer = BaseOffer.extend({
  employmentType: z.literal('internship'),
  hourlyRate: z.coerce.number(),
});

const Offer = z.discriminatedUnion('employmentType', [
  FullTimeOffer,
  InternshipOffer,
]);

type BaseOffer = z.infer<typeof BaseOffer>;
type FullTimeOffer = z.infer<typeof FullTimeOffer>;
type InternshipOffer = z.infer<typeof InternshipOffer>;
type Offer = z.infer<typeof Offer>;

// Core

// "Add Full-Time Offer"

export const AddFullTimeOfferInput = FullTimeOffer.omit({
  company: true,
  employmentType: true,
}).extend({
  additionalNotes: nullableField(BaseOffer.shape.additionalNotes),
  benefits: nullableField(BaseOffer.shape.benefits),
  companyCrunchbaseId: z.string().trim().min(1),
  negotiated: nullableField(BaseOffer.shape.negotiated),
  pastExperience: nullableField(BaseOffer.shape.pastExperience),
  performanceBonus: nullableField(FullTimeOffer.shape.performanceBonus),
  postedBy: z.string().trim().min(1),
  relocation: nullableField(BaseOffer.shape.relocation),
  signOnBonus: nullableField(FullTimeOffer.shape.signOnBonus),
  totalStock: nullableField(FullTimeOffer.shape.totalStock),
});

type AddFullTimeOfferInput = z.infer<typeof AddFullTimeOfferInput>;

/**
 * Adds a full-time offer to the database.
 *
 * @param input - The details for the full-time offer.
 * @returns Result indicating the success or failure of the operation.
 */
export async function addFullTimeOffer(
  input: AddFullTimeOfferInput
): Promise<Result<{ id: string }>> {
  const offer = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return trx
      .insertInto('fullTimeOffers')
      .values({
        additionalNotes: input.additionalNotes,
        baseSalary: input.baseSalary,
        benefits: input.benefits,
        companyId,
        createdAt: new Date(),
        id: id(),
        location: input.location,
        negotiated: input.negotiated,
        pastExperience: input.pastExperience,
        performanceBonus: input.performanceBonus,
        postedAt: new Date(),
        postedBy: input.postedBy,
        relocation: input.relocation,
        role: input.role,
        signOnBonus: input.signOnBonus,
        totalCompensation: calculateTotalCompensation({
          baseSalary: input.baseSalary,
          performanceBonus: input.performanceBonus,
          signOnBonus: input.signOnBonus,
          totalStock: input.totalStock,
        }),
        totalStock: input.totalStock,
        updatedAt: new Date(),
      })
      .returning([
        'id',
        'totalCompensation',
        (eb) => {
          return eb
            .selectFrom('companies')
            .select('companies.name')
            .whereRef('companies.id', '=', 'fullTimeOffers.companyId')
            .as<string>('companyName');
        },
      ])
      .executeTakeFirst();
  });

  if (!offer) {
    return fail({
      code: 404,
      error: 'Failed to create full-time offer.',
    });
  }

  return success(offer);
}

// "Add Internship Offer"

/**
 * Adds an internship offer to the database. Also sends a notification to the
 * compensation channel, w/ the offer details and a link to the offer embedded
 * in the message.
 *
 * @param input - The details for the internship offer.
 * @returns Result indicating the success or failure of the operation.
 */
export const AddInternshipOfferInput = InternshipOffer.omit({
  company: true,
  employmentType: true,
}).extend({
  additionalNotes: nullableField(BaseOffer.shape.additionalNotes),
  benefits: nullableField(BaseOffer.shape.benefits),
  companyCrunchbaseId: z.string().trim().min(1),
  negotiated: nullableField(BaseOffer.shape.negotiated),
  pastExperience: nullableField(BaseOffer.shape.pastExperience),
  postedBy: z.string().trim().min(1),
  relocation: nullableField(BaseOffer.shape.relocation),
});

type AddInternshipOfferInput = z.infer<typeof AddInternshipOfferInput>;

export async function addInternshipOffer(
  input: AddInternshipOfferInput
): Promise<Result<{ id: string }>> {
  const offer = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return trx
      .insertInto('internshipOffers')
      .values({
        additionalNotes: input.additionalNotes,
        benefits: input.benefits,
        companyId,
        createdAt: new Date(),
        hourlyRate: input.hourlyRate,
        id: id(),
        location: input.location,
        negotiated: input.negotiated,
        pastExperience: input.pastExperience,
        postedAt: new Date(),
        postedBy: input.postedBy,
        relocation: input.relocation,
        role: input.role,
        updatedAt: new Date(),
      })
      .returning([
        'id',
        (eb) => {
          return eb
            .selectFrom('companies')
            .select('companies.name')
            .whereRef('companies.id', '=', 'internshipOffers.companyId')
            .as<string>('companyName');
        },
      ])
      .executeTakeFirst();
  });

  if (!offer) {
    return fail({
      code: 404,
      error: 'Failed to create internship offer.',
    });
  }

  return success(offer);
}

type BackfillOffersInput = {
  limit?: number;
};

/**
 * Backfills all the job offers that were shared in compensation channels.
 *
 * This is idempotent and will not re-share job offers that have already been
 * shared. This processes emits a job for each offer so this will happen
 * asynchronously in the background.
 *
 * @returns Result indicating the success or failure of the operation.
 */
async function backfillOffers({
  limit = 5,
}: BackfillOffersInput): Promise<Result> {
  const compensationChannels = await redis.smembers(
    'slack:compensation_channels'
  );

  const slackMessages = await db
    .selectFrom('slackMessages')
    .select([
      'slackMessages.id',
      'slackMessages.channelId',
      'slackMessages.createdAt',
    ])
    .where('slackMessages.channelId', 'in', compensationChannels)
    .where('slackMessages.deletedAt', 'is', null)
    .where('slackMessages.threadId', 'is', null)
    .where('slackMessages.text', 'like', '%Company%')
    .where('slackMessages.text', 'like', '%Location%')
    .where('slackMessages.text', 'like', '%Role%')
    .where((eb) => {
      return eb.not(() => {
        return eb.exists(() => {
          return eb
            .selectFrom('fullTimeOffers')
            .whereRef('slackChannelId', '=', 'slackMessages.channelId')
            .whereRef('slackMessageId', '=', 'slackMessages.id');
        });
      });
    })
    .where((eb) => {
      return eb.not(() => {
        return eb.exists(() => {
          return eb
            .selectFrom('internshipOffers')
            .whereRef('slackChannelId', '=', 'slackMessages.channelId')
            .whereRef('slackMessageId', '=', 'slackMessages.id');
        });
      });
    })
    .orderBy('slackMessages.createdAt', 'desc')
    .limit(limit)
    .execute();

  slackMessages.forEach((slackMessage) => {
    job('offer.share', {
      sendNotification: false,
      slackChannelId: slackMessage.channelId,
      slackMessageId: slackMessage.id,
    });
  });

  return success({});
}

// "Delete Offer"

type DeleteOfferInput = {
  memberId: string;
  offerId: string;
};

/**
 * Deletes an offer from the database, only if the given member has
 * permission to do so. This will attempt to delete the offer from both
 * `fullTimeOffers` and `internshipOffers` tables, one will succeed and
 * one will have no effect.
 *
 * @param input - The offer to delete and the member deleting it.
 * @returns Result indicating the success or failure of the operation.
 */
export async function deleteOffer({
  memberId,
  offerId,
}: DeleteOfferInput): Promise<Result> {
  const hasPermission = await hasOfferWritePermission({
    memberId,
    offerId,
  });

  if (!hasPermission) {
    return fail({
      code: 403,
      error: 'You do not have permission to delete this job offer.',
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx.deleteFrom('fullTimeOffers').where('id', '=', offerId).execute();

    await trx
      .deleteFrom('internshipOffers')
      .where('id', '=', offerId)
      .execute();
  });

  return success({ id: offerId });
}

// "Edit Full-Time Offer"

export const EditFullTimeOfferInput = AddFullTimeOfferInput.omit({
  postedBy: true,
});

type EditFullTimeOfferInput = z.infer<typeof EditFullTimeOfferInput>;

/**
 * Edits a full-time offer.
 *
 * @param offerId - The ID of the full-time offer to edit.
 * @param input - The new details for the full-time offer.
 * @returns Result indicating the success or failure of the operation.
 */
export async function editFullTimeOffer(
  offerId: string,
  input: EditFullTimeOfferInput
): Promise<Result> {
  const offer = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return trx
      .updateTable('fullTimeOffers')
      .set({
        additionalNotes: input.additionalNotes,
        baseSalary: input.baseSalary,
        benefits: input.benefits,
        companyId,
        location: input.location,
        negotiated: input.negotiated,
        pastExperience: input.pastExperience,
        performanceBonus: input.performanceBonus,
        relocation: input.relocation,
        role: input.role,
        signOnBonus: input.signOnBonus,
        totalCompensation: calculateTotalCompensation({
          baseSalary: input.baseSalary,
          performanceBonus: input.performanceBonus,
          signOnBonus: input.signOnBonus,
          totalStock: input.totalStock,
        }),
        totalStock: input.totalStock,
        updatedAt: new Date(),
      })
      .where('id', '=', offerId)
      .returning(['id'])
      .executeTakeFirst();
  });

  if (!offer) {
    return fail({
      code: 404,
      error: 'Could not find full-time offer to update.',
    });
  }

  return success(offer);
}

// "Edit Internship Offer"

export const EditInternshipOfferInput = AddInternshipOfferInput.omit({
  postedBy: true,
});

type EditInternshipOfferInput = z.infer<typeof EditInternshipOfferInput>;

/**
 * Edits an internship offer.
 *
 * @param offerId - The ID of the internship offer to edit.
 * @param input - The new details for the internship offer.
 * @returns Result indicating the success or failure of the operation.
 */
export async function editInternshipOffer(
  offerId: string,
  input: EditInternshipOfferInput
): Promise<Result> {
  const offer = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return trx
      .updateTable('internshipOffers')
      .set({
        additionalNotes: input.additionalNotes,
        benefits: input.benefits,
        companyId,
        hourlyRate: input.hourlyRate,
        location: input.location,
        negotiated: input.negotiated,
        pastExperience: input.pastExperience,
        relocation: input.relocation,
        role: input.role,
        updatedAt: new Date(),
      })
      .where('id', '=', offerId)
      .returning(['id'])
      .executeTakeFirst();
  });

  if (!offer) {
    return fail({
      code: 404,
      error: 'Could not find internship offer to update.',
    });
  }

  return success(offer);
}

// "Share Offer"

const SHARE_OFFER_SYSTEM_PROMPT = dedent`
  You are an AI assistant specialized in extracting structured data about job
  offers from text content. Your task is to analyze the given job offer details
  and extract specific information in a JSON format.
`;

const SHARE_OFFER_PROMPT = dedent`
  Here is the job offer to analyze:

  <job_offer>
    $JOB_OFFER_TEXT
  </job_offer>

  Instructions:
  1. Carefully read and analyze the job offer text.
  2. Determine whether the position is full-time or an internship.
  3. Extract relevant information based on the job type.
  4. Perform any necessary calculations, especially for financial details.
  5. Format the extracted information into a JSON object.

  Before providing the final JSON output, wrap your analysis inside
  <analysis> tags. In your analysis:
  - Clearly state whether the job is full-time or an internship, and provide
    your reasoning for this classification. Quote relevant parts of the job
    offer that support your decision.
  - Show your work step-by-step for any calculations, clearly explaining each
    step and the reasoning behind it.
  - Double-check all numerical values for accuracy by re-calculating and
    comparing results.
  - Ensure any textual fields are concise and relevant, quoting the original
    text where appropriate.

  For both internships and full-time offers, include:
  - "additionalNotes": A catch-all for all other information not captured in
    other fields. Don't leave any information out, but also don't show
    information that was already captured elsewhere. Format it in short
    sentences, multiple sentences if needed. Ignore any user-reported total
    compensation (TC) since we'll calculate that ourselves.
  - "benefits": The user-provided list of benefits. Fix typos and format it in
    sentence case.
  - "location": Format as "City, State". The state should an abbreviation (ie:
    CA). If the location mentions being remote, then just use "Remote". If the
    user specifies a short-hand city, then use the full location (ie: SF
    -> San Francisco, CA, NYC -> New York, NY). If the user specifies multiple
    locations, then use the first location.
  - "negotiated": The user-provided negotiation details. Don't include
    anything in the "benefits" section. Don't format.
  - "pastExperience": The user-provided past experience.
  - "relocation": The user-provided housing/relocation details. Don't format.
  - "role": The role for the job offer. Expand any generic acronyms (ie:
    SWE -> Software Engineer, PM -> Product Manager), but do not expand acronyms
    that are program/company specific (ie: TEIP).

  For a full-time position, extract and calculate:
  - "baseSalary": The annual base salary of the position.
  - "performanceBonus": The annualized performance bonus (if a percentage of base
  salary, convert to annualized amount). If a range is given, use the highest
  amount.
  - "signOnBonus": The total sign-on bonus.
  - "totalStock": The total equity/stock grant.

  For an internship, extract and/or calculate:
  - "hourlyRate": The hourly pay of the position. If the hourly rate is given,
    use that directly. If the monthly rate is given, convert to hourly
    (hourly = monthly * 12 / 52 / 40).

  Output Format:
  After your analysis, provide the extracted information in a JSON object. Use
  null for any fields where information is unavailable or unclear. Here's the
  structure to follow:

  For full-time:
  {
    "additionalNotes": string | null,
    "baseSalary": number,
    "benefits": string | null,
    "company": string,
    "employmentType": "full_time",
    "location": string,
    "negotiated": string | null,
    "pastExperience": string | null,
    "performanceBonus": string | null,
    "relocation": string | null,
    "role": string,
    "signOnBonus": number | null,
    "totalStock": number | null
  }

  For internship:
  {
    "additionalNotes": string | null,
    "benefits": string | null,
    "company": string,
    "employmentType": "internship",
    "hourlyRate": number,
    "location": string,
    "negotiated": string | null,
    "pastExperience": string | null,
    "relocation": string | null,
    "role": string
  }

  Important Rules:
  - If unsure about any value, use null.
  - Ensure all calculations are accurate and double-checked.
  - Keep textual fields concise and relevant.
  - After your analysis, provide only the JSON object, without any additional
    text or tags.

  Now, analyze the job offer and provide the structured data as requested.
`;

type ShareOfferInput = {
  sendNotification?: boolean;
  slackChannelId: string;
  slackMessageId: string;
};

/**
 * Creates an offer that was shared in a Slack message.
 *
 * If the Slack message does not contain the expected format, this function will
 * return early with a success result.
 *
 * Otherwise, we'll pass the Slack message into AI to extract the job offer's
 * details. Then, we'll try to find the most relevant company in our database.
 * Then, we save the job offer in our database and notify the original poster
 * that we've added it to our job offers board.
 *
 * @param input - Input data for sharing a job offer.
 * @returns Result indicating the success or failure of the operation.
 */
async function shareOffer({
  sendNotification = true,
  slackChannelId,
  slackMessageId,
}: ShareOfferInput): Promise<Result> {
  const slackMessage = await db
    .selectFrom('slackMessages')
    .select(['createdAt', 'studentId', 'text', 'userId'])
    .where('channelId', '=', slackChannelId)
    .where('id', '=', slackMessageId)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  // This might be the case if someone posts something in the job offer
  // channel but then quickly deletes it right after.
  if (!slackMessage || !slackMessage.text) {
    return fail({
      code: 404,
      error: 'Could not share offer b/c Slack message was not found.',
    });
  }

  // Sometimes a member will post multiple offer details in a single Slack
  // message. We'll split the message into multiple chunks and process each
  // chunk individually.
  const offerChunks = splitOffers(slackMessage.text);

  // We're only interested in messages that share an offer. If the Slack
  // message doesn't contain the expected format, we'll bail early.
  if (!offerChunks.length) {
    return success({});
  }

  const offers: Offer[] = [];

  for (const offerChunk of offerChunks) {
    const prompt = SHARE_OFFER_PROMPT.replace('$JOB_OFFER_TEXT', offerChunk);

    const completionResult = await getChatCompletion({
      maxTokens: 1000,
      messages: [{ role: 'user', content: prompt }],
      system: [{ type: 'text', text: SHARE_OFFER_SYSTEM_PROMPT }],
      temperature: 0,
    });

    if (!completionResult.ok) {
      return completionResult;
    }

    try {
      const closingTag = '</analysis>';

      const closingTagIndex = completionResult.data.indexOf(closingTag);

      if (closingTagIndex === -1) {
        return fail({
          code: 400,
          error: 'Failed to find relevant JSON in AI response.',
        });
      }

      const jsonString = completionResult.data
        .slice(closingTagIndex + closingTag.length)
        .trim();

      const json = JSON.parse(jsonString);

      offers.push(Offer.parse(json));
    } catch (error) {
      return fail({
        code: 400,
        error: 'Failed to parse or validate JSON from AI response.',
      });
    }
  }

  await db.transaction().execute(async (trx) => {
    for (const offer of offers) {
      const companyId = offer.company
        ? await getMostRelevantCompany(trx, offer.company)
        : null;

      const baseOffer = {
        additionalNotes: offer.additionalNotes,
        benefits: offer.benefits,
        companyId,
        createdAt: new Date(),
        id: id(),
        location: offer.location,
        negotiated: offer.negotiated,
        pastExperience: offer.pastExperience,
        postedAt: slackMessage.createdAt,
        postedBy: slackMessage.studentId,
        relocation: offer.relocation,
        role: offer.role,
        slackChannelId,
        slackMessageId,
        updatedAt: new Date(),
      };

      if (offer.employmentType === 'internship') {
        await trx
          .insertInto('internshipOffers')
          .values({
            ...baseOffer,
            hourlyRate: offer.hourlyRate,
          })
          .returning(['id'])
          .executeTakeFirstOrThrow();
      } else {
        await trx
          .insertInto('fullTimeOffers')
          .values({
            ...baseOffer,
            baseSalary: offer.baseSalary,
            signOnBonus: offer.signOnBonus,
            performanceBonus: offer.performanceBonus,
            totalCompensation: calculateTotalCompensation({
              baseSalary: offer.baseSalary,
              performanceBonus: offer.performanceBonus,
              signOnBonus: offer.signOnBonus,
              totalStock: offer.totalStock,
            }),
            totalStock: offer.totalStock,
          })
          .returning(['id'])
          .executeTakeFirstOrThrow();
      }
    }
  });

  if (sendNotification) {
    job('notification.slack.ephemeral.send', {
      channel: slackChannelId,
      text: `Thanks for sharing your offer details, just added it to our <${ENV.STUDENT_PROFILE_URL}/offers|offer database>! 🙂`,
      threadId: slackMessageId,
      userId: slackMessage.userId,
    });
  }

  return success(offers);
}

/**
 * When a member shares a job offer in Slack, they'll sometimes post multiple
 * offers in a single message. We split the message into chunks, each containing
 * a single job offer.
 *
 * The key delimiter is the "Role/Job" header. We'll split the text at each
 * occurrence of this header.
 *
 * @param text - Text to split.
 * @returns Array of job offer chunks.
 */
function splitOffers(text: string): string[] {
  const header = 'Role/Job'.toLowerCase();

  const indices: number[] = [];

  let currentIndex = text.toLowerCase().indexOf(header);

  while (currentIndex !== -1) {
    indices.push(currentIndex);
    currentIndex = text.toLowerCase().indexOf(header, currentIndex + 1);
  }

  if (indices.length === 0) {
    return [];
  }

  const chunks = indices.map((startIndex, i) => {
    const endIndex = indices[i + 1] || text.length;

    return text.slice(startIndex, endIndex).trim();
  });

  return chunks;
}

// Helpers

type CompensationDetails = {
  baseSalary: number;
  performanceBonus: number | null;
  signOnBonus: number | null;
  totalStock: number | null;
};

/**
 * Calculates the total compensation for a job offer, which follows the formula:
 *
 * `baseSalary + performanceBonus + (totalStock / 4) + (signOnBonus / 4)`
 *
 * @param details - Compensation details.
 * @returns Total compensation.
 */
function calculateTotalCompensation({
  baseSalary,
  performanceBonus,
  signOnBonus,
  totalStock,
}: CompensationDetails) {
  return (
    (baseSalary ?? 0) +
    (performanceBonus ?? 0) +
    (signOnBonus ?? 0) / 4 +
    (totalStock ?? 0) / 4
  );
}

/**
 * Converts an hourly rate to a monthly rate. The formula is:
 *
 * `(hourlyRate * 40 hours/week * 52 weeks/year) / 12 months/year`
 *
 * @param hourlyRate - Hourly rate.
 * @returns Monthly rate.
 *
 * @example
 * hourlyToMonthlyRate(1) // 833.33
 * hourlyToMonthlyRate(25) // 5208.33
 * hourlyToMonthlyRate(50) // 8666.67
 */
export function hourlyToMonthlyRate(hourlyRate: number) {
  return (hourlyRate * 40 * 52) / 12;
}

// "Has Edit Permission"

type HasEditPermissionInput = {
  memberId: string;
  offerId: string;
};

/**
 * Checks if the given member has write (ie: create/edit/delete) permission for
 * the job offer. Returns `true` if the member is the creator of the
 * job offer or if the member is an admin.
 *
 * @param input - Member ID and job offer ID.
 * @returns Whether the member has write permission for the job offer.
 */
export async function hasOfferWritePermission({
  memberId,
  offerId,
}: HasEditPermissionInput): Promise<boolean> {
  function isPosterOrAdmin(
    eb: ExpressionBuilder<DB, 'fullTimeOffers' | 'internshipOffers'>
  ) {
    return eb.or([
      eb('postedBy', '=', memberId),
      eb.exists(() => {
        return eb
          .selectFrom('admins')
          .where('admins.memberId', '=', memberId)
          .where('admins.deletedAt', 'is', null);
      }),
    ]);
  }

  const [fullTimeOffer, internshipOffer] = await Promise.all([
    db
      .selectFrom('fullTimeOffers')
      .where('id', '=', offerId)
      .where(isPosterOrAdmin)
      .executeTakeFirst(),

    db
      .selectFrom('internshipOffers')
      .where('id', '=', offerId)
      .where(isPosterOrAdmin)
      .executeTakeFirst(),
  ]);

  return !!fullTimeOffer || !!internshipOffer;
}

// Worker

export const offerWorker = registerWorker(
  'offer',
  OfferBullJob,
  async (job) => {
    const result = await match(job)
      .with({ name: 'offer.backfill' }, async ({ data }) => {
        return backfillOffers(data);
      })
      .with({ name: 'offer.share' }, async ({ data }) => {
        return shareOffer(data);
      })
      .exhaustive();

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
);
