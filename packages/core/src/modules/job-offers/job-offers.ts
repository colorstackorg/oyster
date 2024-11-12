import dedent from 'dedent';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/api';
import { JobOfferBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { getChatCompletion } from '@/modules/ai/ai';
import { getMostRelevantCompany } from '@/modules/employment/companies';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// "Share Job Offer"

const SHARE_JOB_OFFER_SYSTEM_PROMPT = dedent`
  You are a helpful assistant that extracts structured data about job offers from text content.
  Your job is to analyze the given text and determine if it describes an internship offer or a full-time offer, and then
  extract specific information about compensation, benefits, and other job details in a JSON format.
`;

const SHARE_JOB_OFFER_PROMPT = dedent`
  Here's the job offer details to analyze:

  <job_offer>
    $JOB_OFFER_TEXT
  </job_offer>

  First, determine if the job offer is for an internship or a full-time position.

  If job offer is a full-time position do the following:
  - Extract compensation details from the following Slack message, specifically identifying base salary, stock per year, and bonus. Ideally get the annual base salary. But if there is no annual base salary given, determine the hourly rate.
  - Calculate the annualized stock. Sometimes the value for stock per year will already be given, sometimes you will be given a vesting schedule, or the total amount of stock over a number of years. Calculate a value for stock per year.
  - Calculate the bonus. If bonus is given as a percentage, assume this is percentage of base salary and CALCULATE the value. If sign on bonus and relocation and any other bonuses are also given, SUM all these values.
  - Determine PERFORMANCE_BONUS, SIGN_ON_BONUS, RELOCATION, BENEFITS, YEARS_OF_EXPERIENCE, and NEGOTIATED by extracting the text relevant to this. Return this text. If a particular field is not referenced, return NULL for this field.
  - Let ADDITIONAL_NOTES be a text field containing any additional info present in the job offer but not captured elsewhere.

  Return the response as a json in the format
  <output>
  {
    "employment_type": "full-time",
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
  - Extract compensation details from the job offer, specifically identifying salary. Calculate the hourly rate and the monthly rate.
  - Determine RELOCATION, BENEFITS, YEARS_OF_EXPERIENCE, and NEGOTIATED by extracting the text relevant to this. Return this text. If a particular field is not referenced, return NULL for this field.
  - Let ADDITIONAL_NOTES be a text field containing any additional info present in the job offer but not captured elsewhere.

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
  - If something other than hourly or monthly rate is given, assume 40 hour work week and calculate hourly rate. Return NULL if you are unsure on any values.
`;

const ShareJobOfferResponse = z.discriminatedUnion('employmentType', [
  z.object({
    employmentType: z.literal('internship'),
    company: z.string().trim().min(1).nullable(),
    role: z.string().trim().min(1).nullable(),
    hourlyRate: z.number().nullable(),
    monthlyRate: z.number().nullable(),
    location: z.string().trim().min(1).nullable(),
    relocation: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    yearsOfExperience: z.string().trim().min(1).nullable(),
    negotiatedText: z.string().trim().min(1).nullable(),
    additionalNotes: z.string().trim().min(1).nullable(),
  }),
  z.object({
    employmentType: z.literal('full-time'),
    company: z.string().trim().min(1).nullable(),
    role: z.string().trim().min(1).nullable(),
    baseSalary: z.number().nullable(),
    hourlyRate: z.number().nullable(),
    location: z.string().trim().min(1).nullable(),
    stockPerYear: z.number().nullable(),
    bonus: z.number().nullable(),
    performanceBonus: z.string().trim().min(1).nullable(),
    signOnBonus: z.string().trim().min(1).nullable(),
    relocation: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    yearsOfExperience: z.string().trim().min(1).nullable(),
    negotiatedText: z.string().trim().min(1).nullable(),
    additionalNotes: z.string().trim().min(1).nullable(),
  }),
]);

type ShareJobOfferResponse = z.infer<typeof ShareJobOfferResponse>;

type ShareJobOfferInput = {
  sendNotification?: boolean;
  slackChannelId: string;
  slackMessageId: string;
};

/**
 * Shares a job offer from a Slack message.
 *
 * If the Slack message does not contain the word "role" or "job title", this
 * function will return early with a success result.
 *
 * Otherwise, we'll pass the Slack message into AI to extract the job offer's
 * details. Then, we'll try to find the most relevant
 * company in our database. Then, we save the job offer in our database and
 * notify the original poster that we've added it to our job offers board.
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
  // message doesn't contain the word "role" or "job title", we'll bail early.
  if (
    !slackMessage.text.includes('role') &&
    !slackMessage.text.includes('job title')
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

    const jobOfferId = id();

    if (data.employmentType === 'internship') {
      const result = await trx
        .insertInto('internshipJobOffers')
        .values({
          id: jobOfferId,
          createdAt: new Date(),
          role: data.role,
          hourlyRate: data.hourlyRate,
          monthlyRate: data.monthlyRate,
          location: data.location,
          relocationText: data.relocation,
          benefits: data.benefits,
          yearsOfExperience: data.yearsOfExperience,
          negotiatedText: data.negotiatedText,
          additionalNotes: data.additionalNotes,
          companyId: companyId,
          postedBy: slackMessage.studentId,
          slackChannelId: slackChannelId,
          slackMessageId: slackMessageId,
          updatedAt: new Date(),
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      return result;
    } else {
      const totalCompensation =
        (data.baseSalary ?? 0) + (data.stockPerYear ?? 0) + (data.bonus ?? 0);

      const result = await trx
        .insertInto('fullTimeJobOffers')
        .values({
          id: jobOfferId,
          createdAt: new Date(),
          role: data.role,
          baseSalary: data.baseSalary,
          hourlyRate: data.hourlyRate,
          location: data.location,
          stockPerYear: data.stockPerYear,
          bonus: data.bonus,
          totalCompensation,
          performanceBonusText: data.performanceBonus,
          signOnBonusText: data.signOnBonus,
          relocationText: data.relocation,
          benefits: data.benefits,
          yearsOfExperience: data.yearsOfExperience,
          negotiatedText: data.negotiatedText,
          additionalNotes: data.additionalNotes,
          companyId: companyId,
          postedBy: slackMessage.studentId,
          slackChannelId: slackChannelId,
          slackMessageId: slackMessageId,
          updatedAt: new Date(),
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      return result;
    }
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

// "Delete Job Offer"

type DeleteJobOfferInput = {
  memberId: string;
  jobOfferId: string;
};

/**
 * Deletes an opportunity from the database, only if the given member has
 * permission to do so. The database will cascade delete any associated records
 * (ie: tags, bookmarks, etc).
 *
 * @param input - The job offer to delete and the member deleting it.
 * @returns Result indicating the success or failure of the operation.
 */
export async function deleteJobOffer({
  memberId,
  jobOfferId,
}: DeleteJobOfferInput): Promise<Result> {
  const hasPermission = await hasJobOfferWritePermission({
    memberId,
    jobOfferId,
  });

  if (!hasPermission) {
    return fail({
      code: 403,
      error: 'You do not have permission to delete this job offer.',
    });
  }

  await db.transaction().execute(async (trx) => {
    // Try to delete from both tables - one will succeed and one will have no effect
    // Note that job offer ids are unique across both tables.
    await Promise.all([
      trx
        .deleteFrom('fullTimeJobOffers')
        .where('id', '=', jobOfferId)
        .execute(),
      trx
        .deleteFrom('internshipJobOffers')
        .where('id', '=', jobOfferId)
        .execute(),
    ]);
  });

  return success({ id: jobOfferId });
}

// "Edit Job Offer"

// Input types
export const EditInternshipJobOfferInput = z.object({
  companyCrunchbaseId: z.string().trim().min(1),
  role: z.string().trim().min(1).nullable(),
  hourlyRate: z.number().nullable(),
  monthlyRate: z.number().nullable(),
  location: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  benefits: z.string().trim().min(1).nullable(),
  yearsOfExperience: z.string().trim().min(1).nullable(),
  negotiatedText: z.string().trim().min(1).nullable(),
  additionalNotes: z.string().trim().min(1).nullable(),
});

export const EditFullTimeJobOfferInput = z.object({
  companyCrunchbaseId: z.string().trim().min(1),
  role: z.string().trim().min(1).nullable(),
  baseSalary: z.number().nullable(),
  hourlyRate: z.number().nullable(),
  location: z.string().trim().min(1).nullable(),
  stockPerYear: z.number().nullable(),
  bonus: z.number().nullable(),
  performanceBonus: z.string().trim().min(1).nullable(),
  signOnBonus: z.string().trim().min(1).nullable(),
  relocation: z.string().trim().min(1).nullable(),
  benefits: z.string().trim().min(1).nullable(),
  yearsOfExperience: z.string().trim().min(1).nullable(),
  negotiatedText: z.string().trim().min(1).nullable(),
  additionalNotes: z.string().trim().min(1).nullable(),
});

type EditInternshipJobOfferInput = z.infer<typeof EditInternshipJobOfferInput>;
type EditFullTimeJobOfferInput = z.infer<typeof EditFullTimeJobOfferInput>;

// Edit functions
export async function editInternshipJobOffer(
  jobOfferId: string,
  input: EditInternshipJobOfferInput
): Promise<Result> {
  const result = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return await trx
      .updateTable('internshipJobOffers')
      .set({
        companyId,
        role: input.role,
        hourlyRate: input.hourlyRate,
        monthlyRate: input.monthlyRate,
        location: input.location,
        relocationText: input.relocation,
        benefits: input.benefits,
        yearsOfExperience: input.yearsOfExperience,
        negotiatedText: input.negotiatedText,
        additionalNotes: input.additionalNotes,
        updatedAt: new Date(),
      })
      .where('id', '=', jobOfferId)
      .returning(['id'])
      .executeTakeFirst();
  });

  if (!result) {
    return fail({
      code: 404,
      error: 'Internship job offer not found',
    });
  }

  return success(result);
}

export async function editFullTimeJobOffer(
  jobOfferId: string,
  input: EditFullTimeJobOfferInput
): Promise<Result> {
  const result = await db.transaction().execute(async (trx) => {
    const companyId = await saveCompanyIfNecessary(
      trx,
      input.companyCrunchbaseId
    );

    return await trx
      .updateTable('fullTimeJobOffers')
      .set({
        companyId,
        role: input.role,
        baseSalary: input.baseSalary,
        hourlyRate: input.hourlyRate,
        location: input.location,
        stockPerYear: input.stockPerYear,
        bonus: input.bonus,
        totalCompensation:
          (input.baseSalary ?? 0) +
          (input.stockPerYear ?? 0) +
          (input.bonus ?? 0),
        performanceBonusText: input.performanceBonus,
        signOnBonusText: input.signOnBonus,
        relocationText: input.relocation,
        benefits: input.benefits,
        yearsOfExperience: input.yearsOfExperience,
        negotiatedText: input.negotiatedText,
        additionalNotes: input.additionalNotes,
        updatedAt: new Date(),
      })
      .where('id', '=', jobOfferId)
      .returning(['id'])
      .executeTakeFirst();
  });

  if (!result) {
    return fail({
      code: 404,
      error: 'Full-time job offer not found',
    });
  }

  return success(result);
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
  const jobOffer = await db
    .with('job_offers', (qb) =>
      qb
        .selectFrom('fullTimeJobOffers')
        .select('postedBy')
        .where('id', '=', jobOfferId)
        .unionAll(
          qb
            .selectFrom('internshipJobOffers')
            .select('postedBy')
            .where('id', '=', jobOfferId)
        )
    )
    .selectFrom('job_offers')
    .select('postedBy')
    .where((eb) =>
      eb.or([
        eb('postedBy', '=', memberId),
        eb.exists(
          eb
            .selectFrom('admins')
            .where('memberId', '=', memberId)
            .where('deletedAt', 'is', null)
        ),
      ])
    )
    .executeTakeFirst();

  return !!jobOffer;
}

// Worker

export const jobOfferWorker = registerWorker(
  'job_offer',
  JobOfferBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'job_offer.share' }, async ({ data }) => {
        const result = await shareJobOffer(data);

        if (!result.ok) {
          throw new Error(result.error);
        }

        return result.data;
      })
      .exhaustive();
  }
);
