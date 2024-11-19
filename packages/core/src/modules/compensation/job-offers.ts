import dedent from 'dedent';
import { type ExpressionBuilder } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import { JobOfferBullJob } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { redis } from '@/infrastructure/redis';
import { getChatCompletion } from '@/modules/ai/ai';
import { getMostRelevantCompany } from '@/modules/employment/companies';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Core

type BackfillJobOffersInput = {
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
async function backfillJobOffers({
  limit = 5,
}: BackfillJobOffersInput): Promise<Result> {
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
    .where((eb) => {
      return eb.not(() => {
        return eb.exists(() => {
          return eb
            .selectFrom('fullTimeJobOffers')
            .whereRef('slackChannelId', '=', 'slackMessages.channelId')
            .whereRef('slackMessageId', '=', 'slackMessages.id');
        });
      });
    })
    .where((eb) => {
      return eb.not(() => {
        return eb.exists(() => {
          return eb
            .selectFrom('internshipJobOffers')
            .whereRef('slackChannelId', '=', 'slackMessages.channelId')
            .whereRef('slackMessageId', '=', 'slackMessages.id');
        });
      });
    })
    .orderBy('slackMessages.createdAt', 'desc')
    .limit(limit)
    .execute();

  slackMessages.forEach((slackMessage) => {
    job('job_offer.share', {
      sendNotification: false,
      slackChannelId: slackMessage.channelId,
      slackMessageId: slackMessage.id,
    });
  });

  return success({});
}

// "Delete Job Offer"

type DeleteJobOfferInput = {
  jobOfferId: string;
  memberId: string;
};

/**
 * Deletes a job offer from the database, only if the given member has
 * permission to do so. This will attempt to delete the job offer from both
 * `fullTimeJobOffers` and `internshipJobOffers` tables, one will succeed and
 * one will have no effect.
 *
 * @param input - The job offer to delete and the member deleting it.
 * @returns Result indicating the success or failure of the operation.
 */
export async function deleteJobOffer({
  jobOfferId,
  memberId,
}: DeleteJobOfferInput): Promise<Result> {
  const hasPermission = await hasJobOfferWritePermission({
    jobOfferId,
    memberId,
  });

  if (!hasPermission) {
    return fail({
      code: 403,
      error: 'You do not have permission to delete this job offer.',
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('fullTimeJobOffers')
      .where('id', '=', jobOfferId)
      .execute();

    await trx
      .deleteFrom('internshipJobOffers')
      .where('id', '=', jobOfferId)
      .execute();
  });

  return success({ id: jobOfferId });
}

// "Edit Internship Job Offer"

export const EditInternshipJobOfferInput = z.object({
  additionalNotes: z.string().trim().min(1).nullable(),
  benefits: z.string().trim().min(1).nullable(),
  companyCrunchbaseId: z.string().trim().min(1),
  hourlyRate: z.number(),
  location: z.string().trim().min(1),
  monthlyRate: z.number(),
  negotiated: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  role: z.string().trim().min(1).nullable(),
  yearsOfExperience: z.string().trim().min(1).nullable(),
});

type EditInternshipJobOfferInput = z.infer<typeof EditInternshipJobOfferInput>;

export async function editInternshipJobOffer(
  jobOfferId: string,
  input: EditInternshipJobOfferInput
): Promise<Result> {
  const jobOffer = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return trx
      .updateTable('internshipJobOffers')
      .set({
        additionalNotes: input.additionalNotes,
        benefits: input.benefits,
        companyId,
        hourlyRate: input.hourlyRate,
        location: input.location,
        negotiated: input.negotiated,
        pastExperience: input.yearsOfExperience,
        relocation: input.relocation,
        role: input.role,
        updatedAt: new Date(),
      })
      .where('id', '=', jobOfferId)
      .returning(['id'])
      .executeTakeFirst();
  });

  if (!jobOffer) {
    return fail({
      code: 404,
      error: 'Could not find internship job offer to update.',
    });
  }

  return success(jobOffer);
}

// "Edit Full-Time Job Offer"

export const EditFullTimeJobOfferInput = z.object({
  additionalNotes: z.string().trim().min(1).nullable(),
  baseSalary: z.number(),
  benefits: z.string().trim().min(1).nullable(),
  bonus: z.number().nullable(),
  companyCrunchbaseId: z.string().trim().min(1),
  hourlyRate: z.number().nullable(),
  location: z.string().trim().min(1),
  negotiatedText: z.string().trim().min(1).nullable(),
  pastExperience: z.string().trim().min(1).nullable(),
  performanceBonus: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  role: z.string().trim().min(1).nullable(),
  signOnBonus: z.string().trim().min(1).nullable(),
  totalStock: z.number().nullable(),
});

type EditFullTimeJobOfferInput = z.infer<typeof EditFullTimeJobOfferInput>;

export async function editFullTimeJobOffer(
  jobOfferId: string,
  input: EditFullTimeJobOfferInput
): Promise<Result> {
  const jobOffer = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return trx
      .updateTable('fullTimeJobOffers')
      .set({
        additionalNotes: input.additionalNotes,
        baseSalary: input.baseSalary,
        benefits: input.benefits,
        companyId,
        location: input.location,
        negotiated: input.negotiatedText,
        relocation: input.relocation,
        role: input.role,
        pastExperience: input.pastExperience,
        performanceBonus: input.performanceBonus,
        signOnBonus: input.signOnBonus,
        totalStock: input.totalStock,
        updatedAt: new Date(),
      })
      .where('id', '=', jobOfferId)
      .returning(['id'])
      .executeTakeFirst();
  });

  if (!jobOffer) {
    return fail({
      code: 404,
      error: 'Could not find full-time job offer to update.',
    });
  }

  return success(jobOffer);
}

// "Share Job Offer"

const SHARE_JOB_OFFER_SYSTEM_PROMPT = dedent`
  You are an AI assistant specialized in extracting structured data about job
  offers from text content. Your task is to analyze the given job offer details
  and extract specific information in a JSON format.
`;

const SHARE_JOB_OFFER_PROMPT = dedent`
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

  For both internships and full-time job offers, include:
  - "additionalNotes": A catch-all for all other information not captured in
    other fields. Don't leave any information out, but also don't show information
    that was already captured elsewhere. Format it in a clean list.
  - "benefits": The user-provided list of benefits. Fix typos and format it in
    sentence case.
  - "location": Format as "City, State". If the location mentions being remote,
    then just use "Remote". If the user specifies a short-hand location like
    "SF" or "NYC", then use the full location (ie: San Francisco, CA).
  - "negotiated": The user-provided negotiation details. Don't include
    anything in the "benefits" section. Don't format.
  - "pastExperience": The user-provided past experience.
  - "relocation": The user-provided housing/relocation details. Don't format.
  - "role": The role for the job offer. Expand any acronyms (ie:
    SWE -> Software Engineer, PM -> Product Manager).
  - "signOnBonus": The total sign-on bonus.

  For a full-time position, extract and calculate:
  - "baseSalary": The annual base salary of the position.
  - "performanceBonus": The annualized performance bonus (if a percentage of base
  salary, convert to annualized amount). If a range is given, use the highest
  amount.
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
    "role": string,
    "signOnBonus": number | null
  }

  Important Rules:
  - If unsure about any value, use null.
  - Ensure all calculations are accurate and double-checked.
  - Keep textual fields concise and relevant.
  - After your analysis, provide only the JSON object, without any additional
    text or tags.

  Now, analyze the job offer and provide the structured data as requested.
`;

const BaseJobOffer = z.object({
  additionalNotes: z.string().trim().min(1).nullable(),
  benefits: z.string().trim().min(1).nullable(),
  company: z.string().trim().min(1),
  location: z.string().trim().min(1),
  negotiated: z.string().trim().min(1).nullable(),
  pastExperience: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  role: z.string().trim().min(1),
  signOnBonus: z.coerce.number().nullable(),
});

type BaseJobOffer = z.infer<typeof BaseJobOffer>;

const ShareJobOfferResponse = z.discriminatedUnion('employmentType', [
  BaseJobOffer.extend({
    employmentType: z.literal('internship'),
    hourlyRate: z.coerce.number(),
  }),
  BaseJobOffer.extend({
    baseSalary: z.coerce.number(),
    employmentType: z.literal('full_time'),
    performanceBonus: z.coerce.number().nullable(),
    totalStock: z.coerce.number().nullable(),
  }),
]);

type ShareJobOfferResponse = z.infer<typeof ShareJobOfferResponse>;

type ShareJobOfferInput = {
  sendNotification?: boolean;
  slackChannelId: string;
  slackMessageId: string;
};

/**
 * Creates a job offer that was shared in a Slack message.
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
async function shareJobOffer({
  sendNotification = true,
  slackChannelId,
  slackMessageId,
}: ShareJobOfferInput): Promise<Result> {
  const slackMessage = await db
    .selectFrom('slackMessages')
    .select(['createdAt', 'studentId', 'text', 'userId as slackUserId'])
    .where('channelId', '=', slackChannelId)
    .where('id', '=', slackMessageId)
    .where('deletedAt', 'is', null)
    .executeTakeFirst();

  // This might be the case if someone posts something in the job offer
  // channel but then quickly deletes it right after.
  if (!slackMessage || !slackMessage.text) {
    return fail({
      code: 404,
      error: 'Could not share job offer b/c Slack message was not found.',
    });
  }

  // We're only interested in messages that share a job offer. If the Slack
  // message doesn't contain the expected format, we'll bail early.
  if (
    !slackMessage.text.includes('Company:') &&
    !slackMessage.text.includes('Location:')
  ) {
    return success({});
  }

  const prompt = SHARE_JOB_OFFER_PROMPT.replace(
    '$JOB_OFFER_TEXT',
    slackMessage.text
  );

  const completionResult = await getChatCompletion({
    maxTokens: 1000,
    messages: [{ role: 'user', content: prompt }],
    system: [{ type: 'text', text: SHARE_JOB_OFFER_SYSTEM_PROMPT }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  let data: ShareJobOfferResponse;

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

    data = ShareJobOfferResponse.parse(json);
  } catch (error) {
    return fail({
      code: 400,
      error: 'Failed to parse or validate JSON from AI response.',
    });
  }

  const jobOffer = await db.transaction().execute(async (trx) => {
    const companyId = data.company
      ? await getMostRelevantCompany(trx, data.company)
      : null;

    const baseJobOffer = {
      additionalNotes: data.additionalNotes,
      benefits: data.benefits,
      companyId,
      createdAt: new Date(),
      id: id(),
      location: data.location,
      negotiated: data.negotiated,
      pastExperience: data.pastExperience,
      postedAt: slackMessage.createdAt,
      postedBy: slackMessage.studentId,
      relocation: data.relocation,
      role: data.role,
      slackChannelId,
      slackMessageId,
      updatedAt: new Date(),
    };

    if (data.employmentType === 'internship') {
      return trx
        .insertInto('internshipJobOffers')
        .values({
          ...baseJobOffer,
          hourlyRate: data.hourlyRate,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();
    }

    return trx
      .insertInto('fullTimeJobOffers')
      .values({
        ...baseJobOffer,
        baseSalary: data.baseSalary,
        performanceBonus: data.performanceBonus,
        signOnBonus: data.signOnBonus,
        totalStock: data.totalStock,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  if (sendNotification) {
    const message =
      `Thanks for sharing your compensation details in <#${slackChannelId}> -- I added it to our <${ENV.STUDENT_PROFILE_URL}/compensation|job offers board>! 🙂\n\n` +
      `Verify that the details are correct and refine them if needed: <${ENV.STUDENT_PROFILE_URL}/compensation/${jobOffer.id}/refine|*HERE*>.\n\n` +
      'Thanks again!';

    job('notification.slack.send', {
      channel: slackMessage.slackUserId,
      message,
      workspace: 'regular',
    });
  }

  return success(jobOffer);
}

// Helpers

// "Has Edit Permission"

type HasEditPermissionInput = {
  memberId: string;
  jobOfferId: string;
};

/**
 * Checks if the given member has write (ie: create/edit/delete) permission for
 * the job offer. Returns `true` if the member is the creator of the
 * job offer or if the member is an admin.
 *
 * @param input - Member ID and job offer ID.
 * @returns Whether the member has write permission for the job offer.
 */
export async function hasJobOfferWritePermission({
  memberId,
  jobOfferId,
}: HasEditPermissionInput): Promise<boolean> {
  function isPosterOrAdmin(
    eb: ExpressionBuilder<DB, 'fullTimeJobOffers' | 'internshipJobOffers'>
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

  const [fullTimeJobOffer, internshipJobOffer] = await Promise.all([
    db
      .selectFrom('fullTimeJobOffers')
      .where('id', '=', jobOfferId)
      .where(isPosterOrAdmin)
      .executeTakeFirst(),

    db
      .selectFrom('internshipJobOffers')
      .where('id', '=', jobOfferId)
      .where(isPosterOrAdmin)
      .executeTakeFirst(),
  ]);

  return !!fullTimeJobOffer || !!internshipJobOffer;
}

// Worker

export const jobOfferWorker = registerWorker(
  'job_offer',
  JobOfferBullJob,
  async (job) => {
    const result = await match(job)
      .with({ name: 'job_offer.backfill' }, async ({ data }) => {
        return backfillJobOffers(data);
      })
      .with({ name: 'job_offer.share' }, async ({ data }) => {
        return shareJobOffer(data);
      })
      .exhaustive();

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
);
