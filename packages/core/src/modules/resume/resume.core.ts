import dayjs from 'dayjs';
import dedent from 'dedent';
import { type SelectExpression } from 'kysely';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { type DB, db, point } from '@oyster/db';
import { FORMATTED_RACE, Race } from '@oyster/types';
import { id, run } from '@oyster/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { cache, ONE_WEEK_IN_SECONDS } from '@/infrastructure/redis';
import { getChatCompletion } from '@/modules/ai/ai';
import {
  type AirtableField,
  createAirtableRecord,
  createAirtableTable,
  updateAirtableRecord,
} from '@/modules/airtable/airtable.core';
import { type DegreeType } from '@/modules/education/education.types';
import {
  createGoogleDriveFolder,
  uploadFileToGoogleDrive,
} from '@/modules/google-drive';
import { track } from '@/modules/mixpanel';
import { getPresignedURL, putObject } from '@/modules/object-storage';
import {
  type CreateResumeBookInput,
  RESUME_BOOK_CODING_LANGUAGES,
  RESUME_BOOK_JOB_SEARCH_STATUSES,
  RESUME_BOOK_ROLES,
  type ReviewResumeInput,
  type SubmitResumeInput,
  type UpdateResumeBookInput,
} from '@/modules/resume/resume.types';
import { ColorStackError } from '@/shared/errors';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import { getTextFromPDF } from '@/shared/utils/file.utils';

// Environment Variables

const AIRTABLE_RESUME_BOOKS_BASE_ID = process.env
  .AIRTABLE_RESUME_BOOKS_BASE_ID as string;

const GOOGLE_DRIVE_RESUME_BOOKS_FOLDER_ID = process.env
  .GOOGLE_DRIVE_RESUME_BOOKS_FOLDER_ID as string;

// Constants

const RESUME_FEEDBACK_REDIS_PREFIX = 'resume_feedback:';

// Queries

/**
 * Retrieves the last feedback that the member received on their resume. This
 * feedback is temporarily stored in Redis, not longer-term storage.
 */
export async function getLastResumeFeedback(memberId: string) {
  const feedback = await cache.get<ResumeFeedback>(
    RESUME_FEEDBACK_REDIS_PREFIX + memberId
  );

  return feedback;
}

type GetResumeBookOptions<Selection> = {
  select: Selection[];
  where: Partial<{
    hidden: false;
    id: string;
    status: 'active';
  }>;
};

export async function getResumeBook<
  Selection extends SelectExpression<DB, 'resumeBooks'>,
>({ select, where }: GetResumeBookOptions<Selection>) {
  const resumeBook = await db
    .selectFrom('resumeBooks')
    .select(select)
    .$if(where.hidden !== undefined, (eb) => {
      return eb.where('hidden', '=', where.hidden as boolean);
    })
    .$if(!!where.id, (eb) => {
      return eb.where('id', '=', where.id!);
    })
    .$if(where.status === 'active', (eb) => {
      return eb
        .where('startDate', '<', new Date())
        .where('endDate', '>', new Date());
    })
    .executeTakeFirst();

  return resumeBook;
}

type GetResumeBookSubmissionOptions<Selection> = {
  select: Selection[];
  where: {
    memberId: string;
    resumeBookId: string;
  };
};

export async function getResumeBookSubmission<
  Selection extends SelectExpression<DB, 'resumeBookSubmissions'>,
>({ select, where }: GetResumeBookSubmissionOptions<Selection>) {
  const submission = await db
    .selectFrom('resumeBookSubmissions')
    .select(select)
    .where('memberId', '=', where.memberId)
    .where('resumeBookId', '=', where.resumeBookId)
    .executeTakeFirst();

  return submission;
}

type ListResumeBookOptions<Selection> = {
  select: Selection[];
};

export async function listResumeBooks<
  Selection extends SelectExpression<DB, 'resumeBooks'>,
>({ select }: ListResumeBookOptions<Selection>) {
  const resumeBooks = await db
    .selectFrom('resumeBooks')
    .select(select)
    .orderBy('endDate', 'desc')
    .orderBy('startDate', 'desc')
    .orderBy('createdAt', 'desc')
    .execute();

  return resumeBooks;
}

type ListResumeBookSponsorsOptions = {
  where: { resumeBookId: string };
};

export async function listResumeBookSponsors({
  where,
}: ListResumeBookSponsorsOptions) {
  const sponsors = await db
    .selectFrom('resumeBookSponsors')
    .leftJoin('companies', 'companies.id', 'resumeBookSponsors.companyId')
    .select([
      'companies.domain',
      'companies.id',
      'companies.imageUrl',
      'companies.name',
    ])
    .where('resumeBookId', '=', where.resumeBookId)
    .orderBy('companies.name', 'asc')
    .execute();

  return sponsors;
}

// Use Cases

/**
 * Creates a new resume book as well as the sponsors (companies) of the
 * resume book. This also automatically creates a Google Drive folder and stores
 * a reference on the resume book record.
 */
export async function createResumeBook({
  endDate,
  hidden,
  name,
  sponsors,
  startDate,
}: CreateResumeBookInput) {
  const [airtableTableId, googleDriveFolderId] = await Promise.all([
    createAirtableTable({
      baseId: AIRTABLE_RESUME_BOOKS_BASE_ID,
      fields: await getResumeBookAirtableFields({ sponsors }),
      name,
    }),

    createGoogleDriveFolder({
      folderId: GOOGLE_DRIVE_RESUME_BOOKS_FOLDER_ID,
      name: `${name} Resume Book`,
    }),
  ]);

  await db.transaction().execute(async (trx) => {
    const resumeBookId = id();

    await trx
      .insertInto('resumeBooks')
      .values({
        airtableBaseId: AIRTABLE_RESUME_BOOKS_BASE_ID,
        airtableTableId,
        endDate,
        googleDriveFolderId,
        hidden,
        id: resumeBookId,
        name,
        startDate,
      })
      .execute();

    await trx
      .insertInto('resumeBookSponsors')
      .values(
        sponsors.map((sponsor) => {
          return {
            companyId: sponsor,
            resumeBookId,
          };
        })
      )
      .execute();
  });

  return success({});
}

/**
 * Returns all of the fields that are required for the resume book's Airtable
 * table. This includes options for single select, multiple select, and
 * multiple attachments fields.
 *
 * The only thing that changes for each resume book is the list of sponsors
 * (companies) that are associated with the resume book, so that is the only
 * input required.
 */
async function getResumeBookAirtableFields({
  sponsors,
}: Pick<CreateResumeBookInput, 'sponsors'>): Promise<AirtableField[]> {
  const companies = await db
    .selectFrom('companies')
    .select(['name'])
    .where('id', 'in', sponsors)
    .orderBy('name', 'asc')
    .execute();

  const sponsorOptions = companies.map((company) => {
    return { name: company.name };
  });

  const locationOptions = [
    { name: 'International' },
    { name: 'Canada' },
    { name: 'N/A' },
    { name: 'AL' },
    { name: 'AK' },
    { name: 'AR' },
    { name: 'AZ' },
    { name: 'CA' },
    { name: 'CO' },
    { name: 'CT' },
    { name: 'DC' },
    { name: 'DE' },
    { name: 'FL' },
    { name: 'GA' },
    { name: 'HI' },
    { name: 'IA' },
    { name: 'ID' },
    { name: 'IL' },
    { name: 'IN' },
    { name: 'KS' },
    { name: 'KY' },
    { name: 'LA' },
    { name: 'MA' },
    { name: 'MD' },
    { name: 'ME' },
    { name: 'MI' },
    { name: 'MN' },
    { name: 'MO' },
    { name: 'MS' },
    { name: 'MT' },
    { name: 'NC' },
    { name: 'ND' },
    { name: 'NE' },
    { name: 'NH' },
    { name: 'NJ' },
    { name: 'NM' },
    { name: 'NV' },
    { name: 'NY' },
    { name: 'OH' },
    { name: 'OK' },
    { name: 'OR' },
    { name: 'PA' },
    { name: 'PR' },
    { name: 'RI' },
    { name: 'SC' },
    { name: 'SD' },
    { name: 'TN' },
    { name: 'TX' },
    { name: 'UT' },
    { name: 'VA' },
    { name: 'VT' },
    { name: 'WA' },
    { name: 'WI' },
    { name: 'WV' },
    { name: 'WY' },
  ];

  return [
    {
      name: 'Email',
      type: 'email',
    },
    {
      name: 'First Name',
      type: 'singleLineText',
    },
    {
      name: 'Last Name',
      type: 'singleLineText',
    },
    {
      name: 'Race',
      options: {
        choices: [
          Race.BLACK,
          Race.HISPANIC,
          Race.NATIVE_AMERICAN,
          Race.MIDDLE_EASTERN,
          Race.ASIAN,
          Race.WHITE,
          Race.OTHER,
        ].map((race) => {
          return { name: FORMATTED_RACE[race] };
        }),
      },
      type: 'multipleSelects',
    },
    {
      name: 'Education Level',
      options: {
        choices: [
          { name: 'Undergraduate' },
          { name: 'Masters' },
          { name: 'PhD' },
          { name: 'Early Career Professional' },
        ],
      },
      type: 'singleSelect',
    },
    {
      name: 'Graduation Season',
      options: {
        choices: [{ name: 'Spring' }, { name: 'Fall' }],
      },
      type: 'singleSelect',
    },
    {
      name: 'Graduation Year',
      options: {
        choices: [
          { name: '2020' },
          { name: '2021' },
          { name: '2022' },
          { name: '2023' },
          { name: '2024' },
          { name: '2025' },
          { name: '2026' },
          { name: '2027' },
          { name: '2028' },
          { name: '2029' },
          { name: '2030' },
        ],
      },
      type: 'singleSelect',
    },
    {
      name: 'Location (University)',
      options: { choices: locationOptions },
      type: 'singleSelect',
    },
    {
      name: 'Hometown',
      options: { choices: locationOptions },
      type: 'singleSelect',
    },
    {
      name: 'Role Interest',
      options: {
        choices: RESUME_BOOK_ROLES.map((role) => {
          return { name: role };
        }),
      },
      type: 'multipleSelects',
    },
    {
      name: 'Proficient Language(s)',
      options: {
        choices: RESUME_BOOK_CODING_LANGUAGES.map((language) => {
          return { name: language };
        }),
      },
      type: 'multipleSelects',
    },
    {
      name: 'Employment Search Status',
      options: {
        choices: RESUME_BOOK_JOB_SEARCH_STATUSES.map((status) => {
          return { name: status };
        }),
      },
      type: 'singleSelect',
    },
    {
      name: 'Sponsor Interest #1',
      options: { choices: sponsorOptions },
      type: 'singleSelect',
    },
    {
      name: 'Sponsor Interest #2',
      options: { choices: sponsorOptions },
      type: 'singleSelect',
    },
    {
      name: 'Sponsor Interest #3',
      options: { choices: sponsorOptions },
      type: 'singleSelect',
    },
    {
      name: 'Resume',
      type: 'multipleAttachments',
    },
    {
      name: 'LinkedIn',
      type: 'url',
    },
    {
      name: 'Are you authorized to work in the US or Canada?',
      options: {
        choices: [
          { name: 'Yes' },
          { name: 'Yes, with visa sponsorship' },
          { name: 'No' },
          { name: "I'm not sure" },
        ],
      },
      type: 'singleSelect',
    },
  ];
}

// Review Resume

const ResumeBullet = z.object({
  content: z.string(),
  feedback: z.string(),
  rewrites: z.string().array().min(0).max(2),
  score: z.number().min(1).max(10),
});

const ResumeFeedback = z.object({
  experiences: z
    .object({
      bullets: ResumeBullet.array(),
      company: z.string(),
      role: z.string(),
    })
    .array(),

  projects: z
    .object({
      bullets: ResumeBullet.array(),
      title: z.string(),
    })
    .array(),
});

export type ResumeFeedback = z.infer<typeof ResumeFeedback>;

/**
 * Reviews a resume using AI and returns feedback in the form of JSON that
 * adheres to a specific schema. For now, this feedback is focused on the
 * bullet points of the resume.
 *
 * If there is an issue parsing the AI response, it will throw an error.
 *
 * @todo Implement the ability to review the rest of the resume.
 */
export async function reviewResume({
  memberId,
  resume,
}: ReviewResumeInput): Promise<Result<ResumeFeedback>> {
  const systemPrompt = dedent`
    You are the best resume reviewer in the world, specifically for resumes
    aimed at getting a software engineering internship/new grad role.

    Here are your guidelines for a great bullet point:
    - It starts with a strong action verb.
    - It is specific.
    - It talks about achievements.
    - It is concise. No fluff.
    - If possible, it quantifies impact. Don't be as critical about this for
      projects as you are for work experiences. Also, not every single bullet
      point needs to quantify impact, but you should be able to quantify at
      least 1-2 bullet points per experience.

    Here are your guidelines for giving feedback:
    - Be kind.
    - Be specific.
    - Be actionable.
    - Ask questions (ie: "how many...", "how much...", "what was the impact...").
    - Don't be overly nit-picky.
    - If the bullet point is NOT a 10/10, then the last sentence of your
      feedback MUST be an actionable improvement item.

    Here are your guidelines for rewriting bullet points:
    - If the original bullet point is a 10/10, do NOT suggest any rewrites.
    - If the original bullet point is not a 10/10, suggest 1-2 rewrite
      options. Those rewrite options should be at minimum 9/10.
    - Be 1000% certain that the rewrites address all of your feedback. If
      it doesn't, you're not done yet.
    - Use letters (ie: "x") instead of arbitrary numbers.
    - If details about the "what" are missing, you can use placeholders to
      encourage the user to be more specific (ie: "insert xyz here...").
  `;

  const userPrompt = dedent`
    The following is a resume that has been parsed to text from a PDF. Please
    review this resume.

    IMPORTANT: Do not return ANYTHING except for JSON that respects the
    following Zod schema:

    const ResumeBullet = z.object({
      content: z.string(),
      feedback: z.string(),
      rewrites: z.string().array().min(0).max(2),
      score: z.number().min(1).max(10),
    });

    z.object({
      // This should also include leadership experiences.
      experiences: z
        .object({
          bullets: ResumeBullet.array(),
          company: z.string(),
          role: z.string(),
        })
        .array(),

      projects: z
        .object({
          bullets: ResumeBullet.array(),
          title: z.string(),
        })
        .array(),
    });
  `;

  const resumeText = await getTextFromPDF(resume);

  const completionResult = await getChatCompletion({
    maxTokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'text', text: resumeText },
        ],
      },
    ],
    system: [{ type: 'text', text: systemPrompt, cache: true }],
    temperature: 0.25,
  });

  if (!completionResult.ok) {
    return completionResult;
  }

  track({
    event: 'Resume Reviewed',
    properties: undefined,
    user: memberId,
  });

  try {
    const object = JSON.parse(completionResult.data);
    const feedback = ResumeFeedback.parse(object);

    // We'll cache the feedback for a week so that the user can view the
    // feedback without having to constantly re-run the review.
    await cache.set<ResumeFeedback>(
      RESUME_FEEDBACK_REDIS_PREFIX + memberId,
      feedback,
      ONE_WEEK_IN_SECONDS
    );

    return success(feedback);
  } catch (e) {
    const error = new ColorStackError()
      .withMessage('Failed to parse the AI response.')
      .withContext({ data: completionResult.data, error: e })
      .report();

    return fail({
      code: 500,
      error: error.message,
    });
  }
}

/**
 * Updates the resume book information.
 *
 * This will mainly be used to update the start/end date of the resume book,
 * as well as the name and whether the resume book is hidden or not.
 *
 * @todo Implement the ability to update the sponsors of the resume book.
 * @todo Implement the "edit table" functionality to Airtable.
 */
export async function updateResumeBook({
  endDate,
  hidden,
  id,
  name,
  startDate,
}: UpdateResumeBookInput) {
  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('resumeBooks')
      .set({
        endDate,
        hidden,
        name,
        startDate,
      })
      .where('id', '=', id)
      .execute();
  });

  return success({});
}

/**
 * Submits a resume to the resume book. Note that this same function is used
 * for both the initial submission as well as any subsequent edits to the
 * submission.
 *
 * This function is quite complex because it involves multiple steps and
 * external services. The following is a high-level overview of the steps:
 * - Upload the resume to object storage.
 * - Upload the resume to Google Drive.
 * - Create or update the Airtable record. In order to send the resume file to
 *   Airtable, we first need to generate a presigned URL that allows Airtable to
 *   access the resume file in object storage. Then, Airtable will create its
 *   own copy of the file.
 * - Update the member's information in the database (ie: name, LinkedIn).
 * - Upsert the resume book submission record.
 * - Send an email notification to the student.
 * - If this is the student's first submission, we'll emit a job to grant them
 *   points.
 */
export async function submitResume({
  codingLanguages,
  educationId,
  employmentSearchStatus,
  firstName,
  hometown,
  hometownLatitude,
  hometownLongitude,
  lastName,
  linkedInUrl,
  memberId,
  preferredCompany1,
  preferredCompany2,
  preferredCompany3,
  preferredRoles,
  race,
  resume,
  resumeBookId,
  workAuthorizationStatus,
}: SubmitResumeInput) {
  const [
    submission,
    resumeBook,
    member,
    education,
    company1,
    company2,
    company3,
  ] = await Promise.all([
    getResumeBookSubmission({
      select: ['airtableRecordId', 'googleDriveFileId'],
      where: { memberId, resumeBookId },
    }),

    db
      .selectFrom('resumeBooks')
      .select([
        'airtableBaseId',
        'airtableTableId',
        'googleDriveFolderId',
        'name',
      ])
      .where('id', '=', resumeBookId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('students as members')
      .select(['email'])
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('educations')
      .leftJoin('schools', 'schools.id', 'educations.schoolId')
      .select([
        'educations.degreeType',
        'educations.endDate',
        'schools.addressCity',
        'schools.addressState',
        'schools.addressZip',
      ])
      .where('educations.id', '=', educationId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('companies')
      .select(['name'])
      .where('id', '=', preferredCompany1)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('companies')
      .select(['name'])
      .where('id', '=', preferredCompany2)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('companies')
      .select(['name'])
      .where('id', '=', preferredCompany3)
      .executeTakeFirstOrThrow(),
  ]);

  const isFirstSubmission = !submission;

  // If the resume is present, it can either be a File object or a string.
  const isResumeFile = !!resume && typeof resume !== 'string';

  // Upload the resume to object storage and get a presigned URL which allows
  // the resume to be accessed by Airtable, who will copy the file to their
  // own storage.
  const resumeLink = isResumeFile
    ? await run(async () => {
        const attachmentKey = `resume-books/${resumeBookId}/${memberId}`;

        const arrayBuffer = await resume.arrayBuffer();

        await putObject({
          content: Buffer.from(arrayBuffer),
          contentType: resume.type,
          key: attachmentKey,
        });

        const link = await getPresignedURL({
          key: attachmentKey,
        });

        return link;
      })
    : null;

  // In order to keep the resume file names consistent for the partners,
  // we'll use the same naming convention based on the submitter.
  const graduationYear = education.endDate.getFullYear();
  const fileName = `${lastName}_${firstName}_${graduationYear}.pdf`;

  // We need to do a little massaging/formatting of the data before we sent it
  // over to Airtable.
  const airtableData = {
    'Education Level': run(() => {
      const graduated = dayjs().isAfter(education.endDate);

      if (graduated) {
        return 'Early Career Professional';
      }

      return match(education.degreeType as DegreeType)
        .with('associate', 'bachelors', 'certificate', () => 'Undergraduate')
        .with('doctoral', 'professional', () => 'PhD')
        .with('masters', () => 'Masters')
        .exhaustive();
    }),

    Email: member.email,
    'Employment Search Status': employmentSearchStatus,
    'First Name': firstName,

    'Graduation Season': run(() => {
      return education.endDate.getMonth() <= 6 ? 'Spring' : 'Fall';
    }),

    // We need to convert to a string because Airtable expects strings for
    // their "Single Select" fields, which we're using instead of a "Number"
    // field.
    'Graduation Year': graduationYear.toString(),

    Hometown: run(() => {
      // The hometown is a formatted string that includes a minimum of city
      // and country, and potentially state, neighborhood, etc.
      // Example (1): "Ethiopia"
      // Example (2): "Cairo, Egypt"
      // Example (3): "New York City, NY, USA"
      // Example (4): "Bedford-Stuyvesant, Brooklyn, NY, USA"
      // Example (5): "Harlem, Manhattan, New York, NY, USA"
      const parts = hometown.split(', ');

      // The country is always the last "part".
      const country = parts[parts.length - 1];

      return match(parts.length)
        .with(1, 2, () => {
          return country === 'Puerto Rico' ? 'PR' : 'International';
        })
        .with(3, 4, 5, () => {
          if (country === 'USA') {
            return parts[parts.length - 2]; // This is the state.
          }

          if (country === 'Canada') {
            return 'Canada';
          }

          return 'International';
        })
        .otherwise(() => {
          return country;
        });
    }),

    'Last Name': lastName,
    LinkedIn: linkedInUrl,
    'Location (University)': education.addressState || 'N/A',
    'Proficient Language(s)': codingLanguages,

    Race: race.map((value) => {
      return FORMATTED_RACE[value];
    }),

    ...(!!resumeLink && {
      // See the following Airtable API documentation to understand the format
      // for upload attachments/files:
      // https://airtable.com/developers/web/api/field-model#multipleattachment
      Resume: run(() => {
        return [{ filename: fileName, url: resumeLink }];
      }),
    }),

    'Role Interest': preferredRoles,
    'Sponsor Interest #1': company1.name,
    'Sponsor Interest #2': company2.name,
    'Sponsor Interest #3': company3.name,

    'Are you authorized to work in the US or Canada?': match(
      workAuthorizationStatus
    )
      .with('authorized', () => 'Yes')
      .with('needs_sponsorship', () => 'Yes, with visa sponsorship')
      .with('unauthorized', () => 'No')
      .with('unsure', () => "I'm not sure")
      .exhaustive(),
  };

  const airtableRecordId = isFirstSubmission
    ? await createAirtableRecord({
        airtableBaseId: resumeBook.airtableBaseId,
        airtableTableId: resumeBook.airtableTableId,
        data: airtableData,
      })
    : await updateAirtableRecord({
        airtableBaseId: resumeBook.airtableBaseId,
        airtableRecordId: submission.airtableRecordId,
        airtableTableId: resumeBook.airtableTableId,
        data: airtableData,
      });

  const googleDriveFileId = await run(async () => {
    if (!isResumeFile) {
      return '';
    }

    try {
      const id = await uploadFileToGoogleDrive({
        file: resume,
        fileId: submission?.googleDriveFileId || undefined,
        fileName,
        folderId: resumeBook.googleDriveFolderId as string,
      });

      return id;
    } catch (e) {
      throw new ColorStackError()
        .withMessage('Failed to upload resume to Google Drive.')
        .report();
    }
  });

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('students')
      .set({
        firstName,
        hometown,
        hometownCoordinates: point({
          x: hometownLongitude,
          y: hometownLatitude,
        }),
        lastName,
        linkedInUrl,
        race,
        workAuthorizationStatus,
      })
      .where('id', '=', memberId)
      .execute();

    await trx
      .insertInto('resumeBookSubmissions')
      .values({
        airtableRecordId: airtableRecordId || '',
        codingLanguages,
        educationId,
        employmentSearchStatus,
        googleDriveFileId,
        memberId,
        preferredCompany1,
        preferredCompany2,
        preferredCompany3,
        preferredRoles,
        resumeBookId,
        submittedAt: new Date(),
      })
      .onConflict((oc) => {
        return oc.columns(['memberId', 'resumeBookId']).doUpdateSet((eb) => {
          return {
            airtableRecordId: eb.fn.coalesce(
              'resumeBookSubmissions.airtableRecordId',
              'excluded.airtableRecordId'
            ),
            codingLanguages: eb.ref('excluded.codingLanguages'),
            educationId: eb.ref('excluded.educationId'),
            employmentSearchStatus: eb.ref('excluded.employmentSearchStatus'),
            googleDriveFileId: eb.fn.coalesce(
              'resumeBookSubmissions.googleDriveFileId',
              'excluded.googleDriveFileId'
            ),
            preferredCompany1: eb.ref('excluded.preferredCompany1'),
            preferredCompany2: eb.ref('excluded.preferredCompany2'),
            preferredCompany3: eb.ref('excluded.preferredCompany3'),
            preferredRoles: eb.ref('excluded.preferredRoles'),
            submittedAt: eb.ref('excluded.submittedAt'),
          };
        });
      })
      .execute();
  });

  job('notification.email.send', {
    data: {
      edited: !isFirstSubmission,
      firstName,
      resumeBookName: resumeBook.name,
      resumeBookUri: `${process.env.STUDENT_PROFILE_URL}/resume-books/${resumeBookId}`,
    },
    name: 'resume-submitted',
    to: member.email,
  });

  if (isFirstSubmission) {
    job('gamification.activity.completed', {
      resumeBookId,
      studentId: memberId,
      type: 'submit_resume',
    });
  }

  return success({});
}
