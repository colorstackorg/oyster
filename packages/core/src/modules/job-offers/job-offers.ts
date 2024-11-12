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
  Here's the job offer details to analyze:

  <job_offer>
    $JOB_OFFER_TEXT
  </job_offer>

  First, determine if the job offer is for an internship or a full-time position.

  If job offer is a full-time position do the following:
  - Extract compensation details from the following Slack message, specifically
    identifying base salary, stock per year, and bonus. Ideally get the annual
    base salary. But if there is no annual base salary given, determine the
    hourly rate.
  - Calculate the annualized stock. Sometimes the value for stock per year will
    already be given, sometimes you will be given a vesting schedule, or the
    total amount of stock over a number of years. Calculate a value for stock
    per year.
  - Calculate the bonus. If bonus is given as a percentage, assume this is
    percentage of base salary and CALCULATE the value. If sign on bonus and
    relocation and any other bonuses are also given, SUM all these values.
  - Determine PERFORMANCE_BONUS, SIGN_ON_BONUS, RELOCATION, BENEFITS,
    YEARS_OF_EXPERIENCE, and NEGOTIATED by extracting the text relevant to this.
    Return this text. If a particular field is not referenced, return NULL for
    this field.
  - Let ADDITIONAL_NOTES be a text field containing any additional info present
    in the job offer but not captured elsewhere.

  Return the response as a json in the format
  <output>
  {
    "employment_type": "full_time",
    "company": COMPANY,
    "role": ROLE,
    "base_salary": BASE_SALARY,
    "hourly_rate": HOURLY_RATE,
    "location": LOCATION,
    "stock_per_year": STOCK_PER_YEAR,
    "bonus": BONUS,
    "performance_bonus": PERFORMANCE_BONUS,
    "sign_on_bonus": SIGN_ON_BONUS,
    "relocation": RELOCATION,
    "benefits": BENEFITS,
    "years_of_experience": YEARS_OF_EXPERIENCE,
    "negotiated_text": NEGOTIATED,
    "additional_notes": ADDITIONAL_NOTES
  }
  </output>

  If job offer is an internship do the following:
  - Extract compensation details from the job offer, specifically identifying
    hourly rate and monthly rate.
  - Determine RELOCATION, BENEFITS, YEARS_OF_EXPERIENCE, and NEGOTIATED by
    extracting the text relevant to this. Return this text. If a particular
    field is not referenced, return NULL for this field.
  - Let ADDITIONAL_NOTES be a text field containing any additional info present
    in the job offer but not captured elsewhere.

  Return the response as a json in the format.
  <output>
  {
    "employment_type": "internship",
    "company": COMPANY,
    "role": ROLE,
    "hourly_rate": HOURLY_RATE,
    "monthly_rate": MONTHLY_RATE,
    "location": LOCATION,
    "relocation": RELOCATION,
    "benefits": BENEFITS,
    "years_of_experience": YEARS_OF_EXPERIENCE,
    "negotiated_text": NEGOTIATED,
    "additional_notes": ADDITIONAL_NOTES,
  }
  </output>

  IMPORTANT Rules for all responses:
  - Location should be a city name in the format "{city_name}, {state_abbreviation}"
  - If you are unsure about any value return NULL
  - IMPORTANT: Return ONLY the JSON
  - If something other than hourly or monthly rate is given, assume 40 hour
    work week and calculate hourly rate. Return NULL if you are unsure on any
    values.
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
