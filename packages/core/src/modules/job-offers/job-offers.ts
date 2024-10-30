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
  Your job is to analyze the given text and extract specific information about compensation,
  benefits, and other job details in a JSON format.
`;

const SHARE_JOB_OFFER_PROMPT = dedent`
  Here's the job offer details to analyze:

  <job_offer>
    $JOB_OFFER_TEXT
  </job_offer>

  You need to extract the following information and format it as JSON:

  1. "role": The job title/role
  2. "employmentType": One of: "apprenticeship", "contract", "freelance", "full_time", "internship", "part_time"
  3. "locationType": One of: "hybrid", "in_person", "remote"
  4. "location": The location of the job (city, state or country)
  5. "baseSalary": Base salary as integer (yearly)
  6. "bonus": Performance/yearly bonus as integer
  7. "bonusText": Additional details about the bonus structure
  8. "stockPerYear": Yearly stock grant value as integer
  9. "equityOrStockText": Additional details about equity/stock compensation
  10. "signOnBonus": Sign-on bonus as integer
  11. "relocation": Relocation bonus as integer
  12. "relocationText": Additional details about relocation assistance
  13. "benefits": Description of benefits package
  14. "totalCompensationText": Description of total compensation package
  15. "startDate": Start date in YYYY-MM-DD format
  16. "isNegotiated": Whether this offer was negotiated (true/false)
  17. "isAccepted": Whether this offer was accepted (true/false)
  18. "acceptedReason": If accepted, reason for accepting the offer
  19. "compensationType": Type of compensation structure
  20. "hourlyPay": If hourly position, the hourly rate as integer
  21. "company": The name of the company offering the position

  Follow these guidelines:
  - Use null for any fields you cannot confidently extract
  - All monetary values should be in USD as integers
  - Dates should be in YYYY-MM-DD format
  - Boolean values should be true/false

  Your output should be a single JSON object containing these fields. Do not
  provide any explanation or text outside of the JSON object. Ensure your JSON
  is properly formatted and valid.

  <output>
    {
      "role": "string | null",
      "employmentType": "string | null",
      "locationType": "string | null",
      "location": "string | null",
      "baseSalary": "number | null",
      "bonus": "number | null",
      "bonusText": "string | null",
      "stockPerYear": "number | null",
      "equityOrStockText": "string | null",
      "signOnBonus": "number | null",
      "relocation": "number | null",
      "relocationText": "string | null",
      "benefits": "string | null",
      "totalCompensationText": "string | null",
      "startDate": "string | null",
      "isNegotiated": "boolean",
      "isAccepted": "boolean",
      "acceptedReason": "string | null",
      "compensationType": "string | null",
      "hourlyPay": "number | null",
      "company": "string | null"
    }
  </output>
`;

const ShareJobOfferResponse = z.object({
  role: z.string().trim().min(1).nullable(),
  employmentType: z.string().trim().min(1).nullable(),
  locationType: z.string().trim().min(1).nullable(),
  location: z.string().trim().min(1).nullable(),
  baseSalary: z.number().nullable(),
  bonus: z.number().nullable(),
  bonusText: z.string().trim().min(1).nullable(),
  stockPerYear: z.number().nullable(),
  equityOrStockText: z.string().trim().min(1).nullable(),
  signOnBonus: z.number().nullable(),
  relocation: z.number().nullable(),
  relocationText: z.string().trim().min(1).nullable(),
  benefits: z.string().trim().min(1).nullable(),
  totalCompensationText: z.string().trim().min(1).nullable(),
  startDate: z.string().trim().min(1).nullable(),
  isNegotiated: z.boolean(),
  isAccepted: z.boolean(),
  acceptedReason: z.string().trim().min(1).nullable(),
  compensationType: z.string().trim().min(1).nullable(),
  hourlyPay: z.number().nullable(),
  company: z.string().trim().min(1).nullable(),
});

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

    const result = await trx
      .insertInto('jobOffers')
      .values({
        acceptedReason: data.acceptedReason,
        baseSalary: data.baseSalary,
        benefits: data.benefits,
        bonus: data.bonus,
        bonusText: data.bonusText,
        companyId,
        compensationType: data.compensationType,
        createdAt: new Date(),
        employmentType: data.employmentType,
        equityOrStockText: data.equityOrStockText,
        hourlyPay: data.hourlyPay,
        id: jobOfferId,
        isAccepted: data.isAccepted,
        isNegotiated: data.isNegotiated,
        location: data.location,
        locationType: data.locationType,
        postedBy: slackMessage.studentId,
        relocation: data.relocation,
        relocationText: data.relocationText,
        role: data.role,
        signOnBonus: data.signOnBonus,
        slackChannelId,
        slackMessageId,
        startDate: data.startDate,
        stockPerYear: data.stockPerYear,
        totalCompensationText: data.totalCompensationText,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return result;
  });

  if (sendNotification) {
    const message = `Thanks for sharing your compensation details in <#${slackChannelId}> -- I added it to our <${ENV.STUDENT_PROFILE_URL}/compensation|job offers board>! 🙂`;

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
 * @param input - The opportunity to delete and the member deleting it.
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
      error: 'You do not have permission to delete this opportunity.',
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('jobOffers')
      .where('jobOffers.id', '=', jobOfferId)
      .execute();
  });

  return success({ id: jobOfferId });
}

// "Edit Job Offer"

export const EditJobOfferInput = z.object({
  acceptedReason: z.string().trim().min(1).nullable(),
  baseSalary: z.number().nullable(),
  benefits: z.string().trim().min(1).nullable(),
  bonus: z.number().nullable(),
  bonusText: z.string().trim().min(1).nullable(),
  compensationType: z.string().trim().min(1).nullable(),
  employmentType: z.string().trim().min(1).nullable(),
  equityOrStockText: z.string().trim().min(1).nullable(),
  hourlyPay: z.number().nullable(),
  isAccepted: z.boolean(),
  isNegotiated: z.boolean(),
  location: z.string().trim().min(1).nullable(),
  locationType: z.string().trim().min(1).nullable(),
  relocation: z.number().nullable(),
  relocationText: z.string().trim().min(1).nullable(),
  role: z.string().trim().min(1).nullable(),
  signOnBonus: z.number().nullable(),
  startDate: z.string().trim().min(1).nullable(),
  stockPerYear: z.number().nullable(),
  totalCompensationText: z.string().trim().min(1).nullable(),
});

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
    const result = await trx
      .updateTable('jobOffers')
      .set({
        acceptedReason: input.acceptedReason,
        baseSalary: input.baseSalary,
        benefits: input.benefits,
        bonus: input.bonus,
        bonusText: input.bonusText,
        compensationType: input.compensationType,
        employmentType: input.employmentType,
        equityOrStockText: input.equityOrStockText,
        hourlyPay: input.hourlyPay,
        isAccepted: input.isAccepted,
        isNegotiated: input.isNegotiated,
        location: input.location,
        locationType: input.locationType,
        relocation: input.relocation,
        relocationText: input.relocationText,
        role: input.role,
        signOnBonus: input.signOnBonus,
        startDate: input.startDate,
        stockPerYear: input.stockPerYear,
        totalCompensationText: input.totalCompensationText,
      })
      .where('id', '=', jobOfferId)
      .returning(['id'])
      .execute();

    return result;
  });

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
    .selectFrom('jobOffers')
    .where('jobOffers.id', '=', jobOfferId)
    .where((eb) => {
      return eb.or([
        eb('jobOffers.postedBy', '=', memberId),
        eb.exists(() => {
          return eb
            .selectFrom('admins')
            .where('admins.memberId', '=', memberId)
            .where('admins.deletedAt', 'is', null);
        }),
      ]);
    })
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
