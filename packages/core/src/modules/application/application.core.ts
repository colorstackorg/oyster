import dayjs from 'dayjs';
import { type SelectExpression, sql } from 'kysely';
import { match } from 'ts-pattern';

import { type DB, db } from '@oyster/db';
import { type Application, OtherDemographic } from '@oyster/types';
import { id } from '@oyster/utils';
import { iife } from '@oyster/utils';

import {
  ApplicationBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import {
  ApplicationStatus,
  type ApplyInput,
} from '@/modules/application/application.types';
import { getPostmarkInstance } from '@/modules/notification/shared/email.utils';

// Queries

export async function countPendingApplications() {
  const result = await db
    .selectFrom('applications')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('status', '=', ApplicationStatus.PENDING)
    .executeTakeFirstOrThrow();

  const count = Number(result.count);

  return count;
}

type GetApplicationOptions = {
  withSchool?: boolean;
};

export async function getApplication<
  Selection extends SelectExpression<DB, 'applications'>,
>(id: string, selections: Selection[], options: GetApplicationOptions = {}) {
  const result = await db
    .selectFrom('applications')
    .select(selections)
    .$if(!!options.withSchool, (qb) => {
      return qb
        .leftJoin('schools', 'schools.id', 'applications.schoolId')
        .select(['schools.name as school']);
    })
    .where('applications.id', '=', id)
    .executeTakeFirst();

  return result;
}

type ApplicationsSearchParams = {
  limit: number;
  page: number;
  search: string;
  status: ApplicationStatus | 'all';
  timezone: string;
};

export async function listApplications({
  limit,
  page,
  search,
  status,
  timezone,
}: ApplicationsSearchParams) {
  const query = db
    .selectFrom('applications')
    .$if(!!search, (qb) => {
      return qb.where((eb) =>
        eb.or([
          eb('applications.email', 'ilike', `%${search}%`),
          eb('applications.firstName', 'ilike', `%${search}%`),
          eb('applications.lastName', 'ilike', `%${search}%`),
          eb(
            sql`applications.first_name || ' ' || applications.last_name`,
            'ilike',
            `%${search}%`
          ),
        ])
      );
    })
    .$if(status !== 'all', (qb) => {
      return qb.where('applications.status', '=', status);
    });

  const orderDirection = status === 'pending' ? 'asc' : 'desc';

  const [rows, { count }] = await Promise.all([
    query
      .leftJoin('schools', 'schools.id', 'applications.schoolId')
      .leftJoin('admins', 'admins.id', 'applications.reviewedById')
      .select([
        'applications.createdAt',
        'applications.email',
        'applications.firstName',
        'applications.id',
        'applications.lastName',
        'applications.status',
        'admins.firstName as reviewedByFirstName',
        'admins.lastName as reviewedByLastName',
        (eb) => {
          return eb.fn
            .coalesce('schools.name', 'applications.otherSchool')
            .as('school');
        },
      ])
      .orderBy('applications.createdAt', orderDirection)
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  const applications = rows.map((row) => {
    return {
      ...row,
      createdAt: dayjs(row.createdAt).tz(timezone).format('MM/DD/YY @ h:mm A'),
    };
  });

  return {
    applications,
    totalCount: Number(count),
  };
}

// Use Cases

export async function acceptApplication(
  applicationId: string,
  adminId: string
) {
  const application = await db
    .selectFrom('applications')
    .select([
      'applications.createdAt',
      'applications.educationLevel',
      'applications.email',
      'applications.firstName',
      'applications.gender',
      'applications.graduationYear',
      'applications.id',
      'applications.lastName',
      'applications.linkedInUrl',
      'applications.major',
      'applications.otherDemographics',
      'applications.otherMajor',
      'applications.otherSchool',
      'applications.race',
      'applications.schoolId',
    ])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  let studentId = '';

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('applications')
      .set({
        acceptedAt: new Date(),
        reviewedById: adminId,
        status: ApplicationStatus.ACCEPTED,
      })
      .where('id', '=', applicationId)
      .execute();

    // Some applicants apply multiple times to ColorStack (typically it's an
    // accident) and historically we would _try_ to accept all of their
    // applications, but we can't have multiple members with the same email
    // so it would cause issues. We'll scrap any other pending applications
    // from the same email address.
    await trx
      .deleteFrom('applications')
      .where('email', '=', application.email)
      .where('id', '!=', application.id)
      .where('status', '=', ApplicationStatus.PENDING)
      .execute();

    await trx
      .insertInto('studentEmails')
      .values({ email: application.email })
      .execute();

    const allOtherDemographics = Object.values(OtherDemographic) as string[];

    const otherDemographics = application.otherDemographics.filter(
      (demographic) => {
        return !allOtherDemographics.includes(demographic);
      }
    );

    studentId = id();

    await trx
      .insertInto('students')
      .values({
        acceptedAt: new Date(),
        applicationId: application.id,
        appliedAt: application.createdAt,
        educationLevel: application.educationLevel,
        email: application.email,
        firstName: application.firstName,
        gender: application.gender,
        graduationYear: application.graduationYear.toString(),
        id: studentId,
        lastName: application.lastName,
        linkedInUrl: application.linkedInUrl,
        major: application.major,
        otherDemographics,
        otherMajor: application.otherMajor,
        otherSchool: application.otherSchool,
        race: application.race,
        schoolId: application.schoolId,
      })
      .execute();

    await trx
      .updateTable('studentEmails')
      .set({ studentId })
      .where('email', '=', application.email)
      .execute();
  });

  job('student.created', {
    studentId,
  });

  job('notification.email.send', {
    data: { firstName: application.firstName },
    name: 'application-accepted',
    to: application.email,
  });
}

/**
 * Applies to join the ColorStack family. This also queues a job to send a
 * confirmation email to the applicant.
 */
export async function apply(input: ApplyInput) {
  const applicationId = id();

  await db.transaction().execute(async (trx) => {
    let referralId: string | undefined = undefined;

    if (input.referralId) {
      const referral = await trx
        .selectFrom('referrals')
        .select(['id'])
        .where('id', '=', input.referralId)
        .where('status', '=', 'unused')
        .executeTakeFirst();

      referralId = referral?.id;
    }

    await trx
      .insertInto('applications')
      .values({
        contribution: input.contribution,
        educationLevel: input.educationLevel,
        email: input.email,
        firstName: input.firstName,
        gender: input.gender,
        goals: input.goals,
        graduationYear: input.graduationYear,
        id: applicationId,
        lastName: input.lastName,
        linkedInUrl: input.linkedInUrl,
        major: input.major,
        otherDemographics: input.otherDemographics,
        otherMajor: input.otherMajor,
        otherSchool: input.otherSchool,
        race: input.race,
        referralId,
        schoolId: input.schoolId,
        status: ApplicationStatus.PENDING,
      })
      .execute();
  });

  job('notification.email.send', {
    data: { firstName: input.firstName },
    name: 'application-created',
    to: input.email,
  });

  job('application.review', { applicationId }, { delay: 1000 * 60 * 2.5 });
}

export async function rejectApplication(
  applicationId: string,
  adminId: string
) {
  const application = await db
    .updateTable('applications')
    .set({
      rejectedAt: new Date(),
      reviewedById: adminId,
      status: ApplicationStatus.REJECTED,
    })
    .where('id', '=', applicationId)
    .returning(['email', 'firstName'])
    .executeTakeFirstOrThrow();

  queueRejectionEmail({
    automated: false,
    email: application.email,
    firstName: application.firstName,
  });
}

async function reviewApplication({
  applicationId,
}: GetBullJobData<'application.review'>) {
  const application = await db
    .selectFrom('applications')
    .select([
      'applications.createdAt',
      'applications.educationLevel',
      'applications.email',
      'applications.firstName',
      'applications.graduationYear',
      'applications.id',
      'applications.linkedInUrl',
      'applications.major',
      'applications.race',
      'applications.schoolId',
    ])
    .where('id', '=', applicationId)
    .where('status', '=', ApplicationStatus.PENDING)
    .executeTakeFirst();

  if (!application) {
    return;
  }

  const reject = await shouldReject(application as ApplicationForDecision);

  if (!reject) {
    return;
  }

  await db
    .updateTable('applications')
    .set({
      rejectedAt: new Date(),
      status: ApplicationStatus.REJECTED,
    })
    .where('id', '=', application.id)
    .execute();

  queueRejectionEmail({
    automated: true,
    email: application.email,
    firstName: application.firstName,
  });
}

type ApplicationForDecision = Pick<
  Application,
  | 'createdAt'
  | 'educationLevel'
  | 'email'
  | 'graduationYear'
  | 'id'
  | 'linkedInUrl'
  | 'major'
  | 'race'
  | 'schoolId'
>;

async function shouldReject(
  application: ApplicationForDecision
): Promise<boolean> {
  if (application.educationLevel !== 'undergraduate') {
    return true;
  }

  const currentYear = new Date().getFullYear();

  if (
    application.graduationYear < currentYear ||
    application.graduationYear > currentYear + 5
  ) {
    return true;
  }

  const memberWithSameEmail = await db
    .selectFrom('studentEmails')
    .where('email', 'ilike', application.email)
    .executeTakeFirst();

  if (memberWithSameEmail) {
    return true;
  }

  const postmark = getPostmarkInstance();

  const bounces = await postmark.getBounces({
    count: 1,
    emailFilter: application.email,
    inactive: true,
  });

  if (bounces.TotalCount >= 1) {
    return true;
  }

  return false;
}

type UpdateApplicationEmailInput = Pick<Application, 'email' | 'id'>;

export async function updateEmailApplication({
  email,
  id,
}: UpdateApplicationEmailInput) {
  const existingApplication = await db
    .selectFrom('applications')
    .where('email', 'ilike', email)
    .where('id', '!=', id)
    .executeTakeFirst();

  if (existingApplication) {
    return new Error(
      'There is another application that exists with this email.'
    );
  }

  await db
    .updateTable('applications')
    .set({ email })
    .where('id', '=', id)
    .execute();
}

// Helpers

async function queueRejectionEmail({
  automated,
  email,
  firstName,
}: Pick<Application, 'email' | 'firstName'> & { automated: boolean }) {
  job(
    'notification.email.send',
    {
      data: { firstName },
      name: 'application-rejected',
      to: email,
    },
    {
      delay: automated
        ? iife(() => {
            const now = dayjs().tz('America/Los_Angeles');
            const tomorrowMorning = now.add(1, 'day').hour(9);
            const delay = tomorrowMorning.diff(now);

            return delay;
          })
        : undefined,
    }
  );
}

// Worker

export const applicationWorker = registerWorker(
  'application',
  ApplicationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'application.review' }, ({ data }) => {
        return reviewApplication(data);
      })
      .exhaustive();
  }
);
