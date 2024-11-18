import dedent from 'dedent';
import { type ExpressionBuilder } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, type DB } from '@oyster/db';
import { id } from '@oyster/utils';

import { JobOfferBullJob } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { getChatCompletion } from '@/modules/ai/ai';
import { getMostRelevantCompany } from '@/modules/employment/companies';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// Core

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
  hourlyRate: z.number().nullable(),
  location: z.string().trim().min(1).nullable(),
  monthlyRate: z.number().nullable(),
  negotiatedText: z.string().trim().min(1).nullable(),
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
        monthlyRate: input.monthlyRate,
        negotiatedText: input.negotiatedText,
        relocationText: input.relocation,
        role: input.role,
        updatedAt: new Date(),
        yearsOfExperience: input.yearsOfExperience,
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
  baseSalary: z.number().nullable(),
  benefits: z.string().trim().min(1).nullable(),
  bonus: z.number().nullable(),
  companyCrunchbaseId: z.string().trim().min(1),
  hourlyRate: z.number().nullable(),
  location: z.string().trim().min(1).nullable(),
  negotiatedText: z.string().trim().min(1).nullable(),
  performanceBonus: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  role: z.string().trim().min(1).nullable(),
  signOnBonus: z.string().trim().min(1).nullable(),
  stockPerYear: z.number().nullable(),
  yearsOfExperience: z.string().trim().min(1).nullable(),
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
        bonus: input.bonus,
        companyId,
        hourlyRate: input.hourlyRate,
        location: input.location,
        negotiatedText: input.negotiatedText,
        relocationText: input.relocation,
        role: input.role,
        performanceBonusText: input.performanceBonus,
        signOnBonusText: input.signOnBonus,
        stockPerYear: input.stockPerYear,
        totalCompensation: calculateTotalCompensation({
          baseSalary: input.baseSalary,
          bonus: input.bonus,
          stockPerYear: input.stockPerYear,
        }),
        yearsOfExperience: input.yearsOfExperience,
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
  You are a helpful assistant that extracts structured data about job offers
  from text content.

  Your job is to analyze the given text and determine if it describes an
  internship offer or a full-time offer, and then extract specific information
  about compensation, benefits, and other job details in a JSON format.
`;

const SHARE_JOB_OFFER_PROMPT = dedent`
  You are an AI assistant specialized in extracting structured data about job offers from text content. Your task is to analyze the given job offer details and extract specific information in a JSON format.

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

  Before providing the final JSON output, wrap your analysis inside <job_offer_analysis> tags. In your analysis:
  - Clearly state whether the job is full-time or an internship, and provide your reasoning for this classification. Quote relevant parts of the job offer that support your decision.
  - List out key information from the job offer, categorizing it into "Employment Type," "Salary Information," and "Additional Details." For each piece of information, quote the relevant part of the job offer.
  - Show your work step-by-step for any calculations, clearly explaining each step and the reasoning behind it.
  - Double-check all numerical values for accuracy by re-calculating and comparing results.
  - Ensure any textual fields are concise and relevant, quoting the original text where appropriate.

  For a full-time position, extract and calculate:
  - Base salary (annual or hourly)
  - Annualized stock value
  - Total bonus (including sign-on, performance, relocation)
  - Additional fields: performance bonus, sign-on bonus, relocation, benefits, years of experience, negotiation details

  For an internship, extract:
  - Hourly rate and/or monthly rate
  - Additional fields: relocation, benefits, years of experience, negotiation details

  For both types, include:
  - Company name
  - Role
  - Location (format as "City, State")
  - Any additional notes not captured in other fields

  Output Format:
  After your analysis, provide the extracted information in a JSON object. Use null for any fields where information is unavailable or unclear. Here's the structure to follow:

  For full-time:
  {
    "additionalNotes": string | null,
    "baseSalary": number | null,
    "benefits": string | null,
    "bonus": number | null,
    "company": string,
    "employmentType": "full_time",
    "hourlyRate": number | null,
    "location": string | null,
    "negotiatedText": string | null,
    "performanceBonus": string | null,
    "relocation": string | null,
    "role": string,
    "signOnBonus": string | null,
    "stockPerYear": number | null,
    "yearsOfExperience": string | null
  }

  For internship:
  {
    "additionalNotes": string | null,
    "benefits": string | null,
    "company": string,
    "employmentType": "internship",
    "hourlyRate": number | null,
    "location": string | null,
    "monthlyRate": number | null,
    "negotiatedText": string | null,
    "relocation": string | null,
    "role": string,
    "yearsOfExperience": string | null
  }

  Important Rules:
  - If unsure about any value, use null.
  - For hourly rates, assume a 40-hour work week if calculating from other given information.
  - Ensure all calculations are accurate and double-checked.
  - Keep textual fields concise and relevant.
  - After your analysis, provide only the JSON object, without any additional text or tags.

  Now, analyze the job offer and provide the structured data as requested.
`;

const ShareJobOfferResponse = z.discriminatedUnion('employmentType', [
  z.object({
    additionalNotes: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    company: z.string().trim().min(1).nullable(),
    employmentType: z.literal('internship'),
    hourlyRate: z.number().nullable(),
    location: z.string().trim().min(1).nullable(),
    monthlyRate: z.number().nullable(),
    negotiatedText: z.string().trim().min(1).nullable(),
    relocation: z.string().trim().min(1).nullable(),
    role: z.string().trim().min(1).nullable(),
    yearsOfExperience: z.string().trim().min(1).nullable(),
  }),
  z.object({
    additionalNotes: z.string().trim().min(1).nullable(),
    baseSalary: z.number().nullable(),
    benefits: z.string().trim().min(1).nullable(),
    bonus: z.number().nullable(),
    company: z.string().trim().min(1).nullable(),
    employmentType: z.literal('full_time'),
    hourlyRate: z.number().nullable(),
    location: z.string().trim().min(1).nullable(),
    negotiatedText: z.string().trim().min(1).nullable(),
    performanceBonus: z.string().trim().min(1).nullable(),
    relocation: z.string().trim().min(1).nullable(),
    role: z.string().trim().min(1).nullable(),
    signOnBonus: z.string().trim().min(1).nullable(),
    stockPerYear: z.number().nullable(),
    yearsOfExperience: z.string().trim().min(1).nullable(),
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
    .select(['studentId', 'text', 'userId as slackUserId'])
    .where('channelId', '=', slackChannelId)
    .where('id', '=', slackMessageId)
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
    maxTokens: 250,
    messages: [{ role: 'user', content: prompt }],
    system: [{ type: 'text', text: SHARE_JOB_OFFER_SYSTEM_PROMPT }],
    temperature: 0,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  let data: ShareJobOfferResponse;

  try {
    data = ShareJobOfferResponse.parse(JSON.parse(completionResult.data));
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
      hourlyRate: data.hourlyRate,
      id: id(),
      location: data.location,
      negotiatedText: data.negotiatedText,
      postedBy: slackMessage.studentId,
      relocationText: data.relocation,
      role: data.role,
      slackChannelId,
      slackMessageId,
      updatedAt: new Date(),
      yearsOfExperience: data.yearsOfExperience,
    };

    if (data.employmentType === 'internship') {
      return trx
        .insertInto('internshipJobOffers')
        .values({
          ...baseJobOffer,
          monthlyRate: data.monthlyRate,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();
    }

    return trx
      .insertInto('fullTimeJobOffers')
      .values({
        ...baseJobOffer,
        baseSalary: data.baseSalary,
        bonus: data.bonus,
        performanceBonusText: data.performanceBonus,
        signOnBonusText: data.signOnBonus,
        stockPerYear: data.stockPerYear,
        totalCompensation: calculateTotalCompensation({
          baseSalary: data.baseSalary,
          bonus: data.bonus,
          stockPerYear: data.stockPerYear,
        }),
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

type CompensationDetails = {
  baseSalary: number | null;
  bonus: number | null;
  stockPerYear: number | null;
};

/**
 * Calculates the total compensation for a job offer, which is the sum of the
 * base salary, stock per year, and bonus (itemized over 4 years).
 *
 * @param details - Compensation details.
 * @returns Total compensation.
 */
function calculateTotalCompensation({
  baseSalary,
  bonus,
  stockPerYear,
}: CompensationDetails) {
  baseSalary = baseSalary ?? 0;
  bonus = (bonus ?? 0) / 4; // Itemize the bonus over 4 years.
  stockPerYear = stockPerYear ?? 0;

  return baseSalary + stockPerYear + bonus;
}

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
