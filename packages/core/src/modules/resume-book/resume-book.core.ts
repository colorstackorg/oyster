import dayjs from 'dayjs';
import { type SelectExpression } from 'kysely';
import { match } from 'ts-pattern';

import { type DB, db, point } from '@oyster/db';
import { FORMATTED_RACE } from '@oyster/types';
import { id, iife } from '@oyster/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { createAirtableRecord } from '@/modules/airtable/use-cases/create-airtable-record';
import { updateAirtableRecord } from '@/modules/airtable/use-cases/update-airtable-record';
import { type DegreeType } from '@/modules/education/education.types';
import { getPresignedURL, putObject } from '@/modules/object-storage';
import {
  type CreateResumeBookInput,
  type SubmitResumeInput,
} from '@/modules/resume-book/resume-book.types';

// Queries

type GetResumeBookOptions<Selection> = {
  select: Selection[];
  where: { id: string };
};

export async function getResumeBook<
  Selection extends SelectExpression<DB, 'resumeBooks'>,
>({ select, where }: GetResumeBookOptions<Selection>) {
  const resumeBook = await db
    .selectFrom('resumeBooks')
    .select(select)
    .where('id', '=', where.id)
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

export async function listResumeBooks() {
  const resumeBooks = await db
    .selectFrom('resumeBooks')
    .select([
      'airtableBaseId',
      'airtableTableId',
      'endDate',
      'id',
      'name',
      'startDate',

      (eb) => {
        return eb
          .selectFrom('resumeBookSubmissions')
          .select((eb) => eb.fn.countAll().as('submissions'))
          .whereRef('resumeBooks.id', '=', 'resumeBookSubmissions.resumeBookId')
          .as('submissions');
      },
    ])
    .orderBy('startDate', 'desc')
    .orderBy('endDate', 'desc')
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
    .select(['companies.id', 'companies.name'])
    .where('resumeBookId', '=', where.resumeBookId)
    .execute();

  return sponsors;
}

// Mutations

export async function createResumeBook(input: CreateResumeBookInput) {
  await db.transaction().execute(async (trx) => {
    const resumeBookId = id();

    await trx
      .insertInto('resumeBooks')
      .values({
        airtableBaseId: input.airtableBaseId,
        airtableTableId: input.airtableTableId,
        endDate: input.endDate,
        id: resumeBookId,
        name: input.name,
        startDate: input.startDate,
      })
      .execute();

    await trx
      .insertInto('resumeBookSponsors')
      .values(
        input.sponsors.map((sponsor) => {
          return {
            companyId: sponsor,
            resumeBookId,
          };
        })
      )
      .execute();
  });
}

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
      select: ['airtableRecordId'],
      where: { memberId, resumeBookId },
    }),

    db
      .selectFrom('resumeBooks')
      .select(['airtableBaseId', 'airtableTableId', 'name'])
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

  // Upload the resume to object storage and get a presigned URL which allows
  // the resume to be accessed by Airtable, who will copy the file to their
  // own storage.
  const resumeLink = resume
    ? await iife(async function uploadResume() {
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

  // We need to do a little massaging/formatting of the data before we sent it
  // over to Airtable.
  const airtableData = iife(function formatAirtableRecord() {
    const graduationYear = education.endDate.getFullYear();

    return {
      'Education Level': iife(() => {
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
      'Graduation Season': iife(() => {
        return education.endDate.getMonth() <= 6 ? 'Spring' : 'Fall';
      }),

      // We need to convert to a string because Airtable expects strings for
      // their "Single Select" fields, which we're using instead of a "Number"
      // field.
      'Graduation Year': graduationYear.toString(),

      Hometown: iife(() => {
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
        Resume: iife(() => {
          // In order to keep the resume file names consistent for the partners,
          // we'll use the same naming convention based on the submitter.
          const filename = `${lastName}_${firstName}_${graduationYear}.pdf`;

          return [{ filename, url: resumeLink }];
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
  });

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
            codingLanguages: eb.ref('excluded.codingLanguages'),
            educationId: eb.ref('excluded.educationId'),
            employmentSearchStatus: eb.ref('excluded.employmentSearchStatus'),
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
}
