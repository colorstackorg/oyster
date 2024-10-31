import dedent from 'dedent';
import { type Transaction } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/api';
import { JobOfferBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { getChatCompletion } from '@/modules/ai/ai';
import { searchCrunchbaseOrganizations } from '@/modules/employment/queries/search-crunchbase-organizations';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { ENV } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core.utils';

// "Share Job Offer"

const SHARE_JOB_OFFER_SYSTEM_PROMPT = dedent`
  You are a helpful assistant that extracts structured data about job offers from text content.
  Your job is to analyze the given text and determine if it describes an internship offer or a full-time offer, and then
  extract specific information about compensation,benefits, and other job details in a JSON format.
`;

const SHARE_JOB_OFFER_PROMPT = dedent`
  Here's the job offer details to analyze:

  <job_offer>
    $JOB_OFFER_TEXT
  </job_offer>

  First, determine if the job offer is for an internship or a full-time position.

  If the job offer is for an internship, you need to extract the following information and format it as JSON:

  1. "role": The job title/role
  2. "locationType": One of: "hybrid", "in_person", "remote"
  3. "location": The location of the job (city, state or country)
  4. "hourly_salary": Hourly pay rate as integer
  5. "monthly_salary": Monthly salary as integer
  6. "bonus": Performance/bonus as integer
  7. "bonus_text": Additional details about the bonus structure
  8. "equity_or_stock_text": Details about any equity compensation
  9. "relocation": Relocation bonus as integer
  10. "relocation_text": Additional details about relocation assistance
  11. "benefits": Description of benefits package
  12. "startDate": Start date in YYYY-MM-DD format
  13. "isNegotiated": Whether this offer was negotiated (true/false)
  14. "isAccepted": Whether this offer was accepted (true/false)
  15. "decision_reason": If accepted/rejected, reason for the decision
  16. "company": The name of the company offering the position


  If the job offer is for a full-time position, you need to extract the following information and format it as JSON:
  1. "role": The job title/role
  2. "locationType": One of: "hybrid", "in_person", "remote"
  3. "location": The location of the job (city, state or country)
  4. "base_salary": Base yearly salary as integer
  5. "bonus": Performance/yearly bonus as integer
  6. "bonus_text": Additional details about the bonus structure
  7. "stock_per_year": Yearly stock grant value as integer
  8. "equity_or_stock_text": Details about equity/stock compensation
  9. "relocation": Relocation bonus as integer
  10. "relocation_text": Additional details about relocation assistance
  11. "benefits": Description of benefits package
  12. "total_compensation_text": Description of total compensation package
  13. "startDate": Start date in YYYY-MM-DD format
  14. "isNegotiated": Whether this offer was negotiated (true/false)
  15. "isAccepted": Whether this offer was accepted (true/false)
  16. "decision_reason": If accepted/rejected, reason for the decision
  17. "company": The name of the company offering the position


  Follow these guidelines:
  - Use null for any fields you cannot confidently extract
  - All monetary values should be in USD as integers
  - Dates should be in YYYY-MM-DD format
  - Boolean values should be true/false

  Your output should be a single JSON object containing these fields. Do not
  provide any explanation or text outside of the JSON object. Ensure your JSON
  is properly formatted and valid.

  For internships:
  <output>
    {
      "employmentType": "internship",
      "role": "string | null",
      "locationType": "string | null",
      "location": "string | null",
      "hourly_salary": "number | null",
      "monthly_salary": "number | null",
      "bonus": "number | null",
      "bonus_text": "string | null",
      "equity_or_stock_text": "string | null",
      "relocation": "number | null",
      "relocation_text": "string | null",
      "benefits": "string | null",
      "startDate": "string | null",
      "isNegotiated": "boolean",
      "isAccepted": "boolean",
      "decision_reason": "string | null",
      "company": "string | null"
    }
  </output>

  For full-time positions:
  <output>
    {
      "employmentType": "full_time",
      "role": "string | null",
      "locationType": "string | null",
      "location": "string | null",
      "base_salary": "number | null",
      "bonus": "number | null",
      "bonus_text": "string | null",
      "stock_per_year": "number | null",
      "equity_or_stock_text": "string | null",
      "relocation": "number | null",
      "relocation_text": "string | null",
      "benefits": "string | null",
      "total_compensation_text": "string | null",
      "startDate": "string | null",
      "isNegotiated": "boolean",
      "isAccepted": "boolean",
      "decision_reason": "string | null",
      "company": "string | null"
    }
  </output>
`;

const ShareJobOfferResponse = z.discriminatedUnion('employmentType', [
  z.object({
    employmentType: z.literal('internship'),
    role: z.string().trim().min(1).nullable(),
    locationType: z.string().trim().min(1).nullable(),
    location: z.string().trim().min(1).nullable(),
    hourly_salary: z.number().nullable(),
    monthly_salary: z.number().nullable(),
    bonus: z.number().nullable(),
    bonus_text: z.string().trim().min(1).nullable(),
    equity_or_stock_text: z.string().trim().min(1).nullable(),
    relocation: z.number().nullable(),
    relocation_text: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    startDate: z.string().trim().min(1).nullable(),
    isNegotiated: z.boolean(),
    isAccepted: z.boolean(),
    decision_reason: z.string().trim().min(1).nullable(),
    company: z.string().trim().min(1).nullable(),
  }),
  z.object({
    employmentType: z.literal('full_time'),
    role: z.string().trim().min(1).nullable(),
    locationType: z.string().trim().min(1).nullable(),
    location: z.string().trim().min(1).nullable(),
    base_salary: z.number().nullable(),
    bonus: z.number().nullable(),
    bonus_text: z.string().trim().min(1).nullable(),
    stock_per_year: z.number().nullable(),
    equity_or_stock_text: z.string().trim().min(1).nullable(),
    relocation: z.number().nullable(),
    relocation_text: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    total_compensation_text: z.string().trim().min(1).nullable(),
    startDate: z.string().trim().min(1).nullable(),
    isNegotiated: z.boolean(),
    isAccepted: z.boolean(),
    decision_reason: z.string().trim().min(1).nullable(),
    company: z.string().trim().min(1).nullable(),
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
          hourlySalary: data.hourly_salary,
          monthlySalary: data.monthly_salary,
          companyId: companyId,
          startDate: data.startDate,
          updatedAt: new Date(),
          location: data.location,
          locationType: data.locationType,
          role: data.role,
          equityOrStockText: data.equity_or_stock_text,
          bonus: data.bonus,
          bonusText: data.bonus_text,
          relocation: data.relocation,
          relocationText: data.relocation_text,
          benefits: data.benefits,
          isNegotiated: data.isNegotiated,
          isAccepted: data.isAccepted,
          decisionReason: data.decision_reason,
          postedBy: slackMessage.studentId,
          slackChannelId: slackChannelId,
          slackMessageId: slackMessageId,
        })
        .returning(['id'])
        .executeTakeFirstOrThrow();

      return result;
    } else {
      const result = await trx
        .insertInto('fullTimeJobOffers')
        .values({
          id: jobOfferId,
          createdAt: new Date(),
          baseSalary: data.base_salary,
          bonus: data.bonus,
          bonusText: data.bonus_text,
          companyId: companyId,
          startDate: data.startDate,
          stockPerYear: data.stock_per_year,
          equityOrStockText: data.equity_or_stock_text,
          updatedAt: new Date(),
          location: data.location,
          locationType: data.locationType,
          role: data.role,
          totalCompensationText: data.total_compensation_text,
          benefits: data.benefits,
          isNegotiated: data.isNegotiated,
          isAccepted: data.isAccepted,
          decisionReason: data.decision_reason,
          postedBy: slackMessage.studentId,
          slackChannelId: slackChannelId,
          slackMessageId: slackMessageId,
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

export const EditJobOfferInput = z.discriminatedUnion('employmentType', [
  z.object({
    employmentType: z.literal('internship'),
    role: z.string().trim().min(1).nullable(),
    locationType: z.string().trim().min(1).nullable(),
    location: z.string().trim().min(1).nullable(),
    hourly_salary: z.number().nullable(),
    monthly_salary: z.number().nullable(),
    bonus: z.number().nullable(),
    bonus_text: z.string().trim().min(1).nullable(),
    equity_or_stock_text: z.string().trim().min(1).nullable(),
    relocation: z.number().nullable(),
    relocation_text: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    startDate: z.string().trim().min(1).nullable(),
    isNegotiated: z.boolean(),
    isAccepted: z.boolean(),
    decision_reason: z.string().trim().min(1).nullable(),
  }),
  z.object({
    employmentType: z.literal('full_time'),
    role: z.string().trim().min(1).nullable(),
    locationType: z.string().trim().min(1).nullable(),
    location: z.string().trim().min(1).nullable(),
    base_salary: z.number().nullable(),
    bonus: z.number().nullable(),
    bonus_text: z.string().trim().min(1).nullable(),
    stock_per_year: z.number().nullable(),
    equity_or_stock_text: z.string().trim().min(1).nullable(),
    relocation: z.number().nullable(),
    relocation_text: z.string().trim().min(1).nullable(),
    benefits: z.string().trim().min(1).nullable(),
    total_compensation_text: z.string().trim().min(1).nullable(),
    startDate: z.string().trim().min(1).nullable(),
    isNegotiated: z.boolean(),
    isAccepted: z.boolean(),
    decision_reason: z.string().trim().min(1).nullable(),
  }),
]);

type EditJobOfferInput = z.infer<typeof EditJobOfferInput>;

/**
 * Edits a job offer.
 *
 * @param jobOfferId - The job offer to edit.
 * @param input - The updated values for the job offer.
 * @returns Result indicating the success or failure of the operation.
 */
export async function editJobOffer(
  jobOfferId: string,
  input: EditJobOfferInput
): Promise<Result> {
  const result = await db.transaction().execute(async (trx) => {
    if (input.employmentType === 'internship') {
      return await trx
        .updateTable('internshipJobOffers')
        .set({
          role: input.role,
          locationType: input.locationType,
          location: input.location,
          hourlySalary: input.hourly_salary,
          monthlySalary: input.monthly_salary,
          bonus: input.bonus,
          bonusText: input.bonus_text,
          equityOrStockText: input.equity_or_stock_text,
          relocation: input.relocation,
          relocationText: input.relocation_text,
          benefits: input.benefits,
          startDate: input.startDate,
          isNegotiated: input.isNegotiated,
          isAccepted: input.isAccepted,
          decisionReason: input.decision_reason,
          updatedAt: new Date(),
        })
        .where('id', '=', jobOfferId)
        .returning(['id'])
        .executeTakeFirst();
    } else {
      return await trx
        .updateTable('fullTimeJobOffers')
        .set({
          role: input.role,
          locationType: input.locationType,
          location: input.location,
          baseSalary: input.base_salary,
          bonus: input.bonus,
          bonusText: input.bonus_text,
          stockPerYear: input.stock_per_year,
          equityOrStockText: input.equity_or_stock_text,
          relocation: input.relocation,
          relocationText: input.relocation_text,
          benefits: input.benefits,
          totalCompensationText: input.total_compensation_text,
          startDate: input.startDate,
          isNegotiated: input.isNegotiated,
          isAccepted: input.isAccepted,
          decisionReason: input.decision_reason,
          updatedAt: new Date(),
        })
        .where('id', '=', jobOfferId)
        .returning(['id'])
        .executeTakeFirst();
    }
  });

  if (!result) {
    return fail({
      code: 404,
      error: 'Job offer not found',
    });
  }

  return success(result);
}

// Helper functions

// TODO: Refactor this to be a shared utility function. It is also used in
// opportunity.ts.
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

  if (company && areNamesSimilar(companyName, company.name)) {
    return saveCompanyIfNecessary(trx, company.crunchbaseId);
  }

  return null;
}

/**
 * Checks if two company names are similar by checking if one string is a
 * substring of the other. This does a naive comparison by removing all
 * non-alphanumeric characters and converting to lowercase.
 *
 * @param name1 - First company name.
 * @param name2 - Second company name.
 * @returns Whether the two company names are similar.
 */
function areNamesSimilar(name1: string, name2: string) {
  const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
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
