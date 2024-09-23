import dayjs from 'dayjs';
import { type SelectExpression, sql } from 'kysely';
import { match } from 'ts-pattern';

import { type DB, db } from '@oyster/db';
import { type Application, OtherDemographic } from '@oyster/types';
import { id, run } from '@oyster/utils';

import {
  ApplicationBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import {
  type ApplicationRejectionReason,
  ApplicationStatus,
  type ApplyInput,
} from '@/modules/application/application.types';
import { getPostmarkInstance } from '@/modules/notification/shared/email.utils';
import { ReferralStatus } from '@/modules/referral/referral.types';
import { ENV } from '@/shared/env';

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
  withReferrer?: true;
  withSchool?: true;
};

export async function getApplication<
  Selection extends SelectExpression<DB, 'applications'>,
>(id: string, selections: Selection[], options: GetApplicationOptions = {}) {
  const result = await db
    .selectFrom('applications')
    .select(selections)
    .$if(!!options.withReferrer, (qb) => {
      return qb
        .leftJoin('referrals', 'referrals.id', 'applications.referralId')
        .leftJoin(
          'students as referrers',
          'referrers.id',
          'referrals.referrerId'
        )
        .select([
          'referrers.firstName as referrerFirstName',
          'referrers.id as referrerId',
          'referrers.lastName as referrerLastName',
        ]);
    })
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
        'applications.rejectionReason',
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
      'applications.referralId',
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

    if (application.referralId) {
      await trx
        .updateTable('referrals')
        .set({ status: ReferralStatus.ACCEPTED })
        .where('id', '=', application.referralId)
        .execute();
    }

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

  if (application.referralId) {
    const referral = await db
      .selectFrom('referrals')
      .leftJoin('students as referrers', 'referrers.id', 'referrals.referrerId')
      .select([
        'referrals.firstName as referredFirstName',
        'referrals.lastName as referredLastName',
        'referrers.email as referrerEmail',
        'referrers.id as referrerId',
        'referrers.firstName as referrerFirstName',
      ])
      .where('referrals.id', '=', application.referralId)
      .executeTakeFirst();

    if (referral) {
      job('notification.email.send', {
        data: {
          firstName: referral.referrerFirstName as string,
          referralsUri: `${ENV.MEMBER_PROFILE_URL}/profile/referrals`,
          referredFirstName: referral.referredFirstName,
          referredLastName: referral.referredLastName,
        },
        name: 'referral-accepted',
        to: referral.referrerEmail as string,
      });

      job('gamification.activity.completed', {
        referralId: application.referralId,
        studentId: referral.referrerId as string,
        type: 'refer_friend',
      });
    }
  }
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
      const referral = await db
        .updateTable('referrals')
        .set({ status: ReferralStatus.APPLIED })
        .where('id', '=', input.referralId)
        .where('status', '=', ReferralStatus.SENT)
        .returning(['id'])
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
  adminId: string,
  reason: ApplicationRejectionReason
) {
  const application = await db.transaction().execute(async (trx) => {
    const application = await trx
      .updateTable('applications')
      .set({
        rejectedAt: new Date(),
        rejectionReason: reason,
        reviewedById: adminId,
        status: ApplicationStatus.REJECTED,
      })
      .where('id', '=', applicationId)
      .returning(['email', 'firstName', 'referralId'])
      .executeTakeFirstOrThrow();

    if (application.referralId) {
      await trx
        .updateTable('referrals')
        .set({ status: ReferralStatus.REJECTED })
        .where('id', '=', application.referralId)
        .execute();
    }

    return application;
  });

  queueRejectionEmail({
    automated: false,
    email: application.email,
    firstName: application.firstName,
    reason,
  });
}

export async function updateEmailApplication({
  email,
  id,
}: Pick<Application, 'email' | 'id'>) {
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

const ExpandedRejectionReason: Record<ApplicationRejectionReason, string> = {
  bad_linkedin:
    'Your LinkedIn profile is either incomplete or ' +
    'does not match the information you provided in your application.',

  email_already_used:
    'There is already a ColorStack member with this email address.',

  // We're not going to email them again since they've already bounced...
  email_bounced: '',

  ineligible_major: 'We only admit Computer Science (and related) majors.',

  is_international: 'We only admit students enrolled in the US or Canada.',

  not_undergraduate: 'We only admit undergraduate students.',

  other:
    'Due to the volume of applications we receive, we will not be able to ' +
    'provide additional feedback on your application.',
};

type QueueRejectionEmailInput = Pick<Application, 'email' | 'firstName'> & {
  automated: boolean;
  reason: ApplicationRejectionReason;
};

function queueRejectionEmail({
  automated,
  email,
  firstName,
  reason,
}: QueueRejectionEmailInput) {
  job(
    'notification.email.send',
    {
      data: {
        firstName,
        reason: ExpandedRejectionReason[reason],
      },
      name: 'application-rejected',
      to: email,
    },
    {
      delay: automated
        ? run(() => {
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
      'applications.referralId',
      'applications.schoolId',
    ])
    .where('id', '=', applicationId)
    .where('status', '=', ApplicationStatus.PENDING)
    .executeTakeFirst();

  if (!application) {
    return;
  }

  const [reject, reason] = await shouldReject(
    application as ApplicationForDecision
  );

  if (!reject) {
    return;
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('applications')
      .set({
        rejectedAt: new Date(),
        rejectionReason: reason,
        status: ApplicationStatus.REJECTED,
      })
      .where('id', '=', application.id)
      .execute();

    if (application.referralId) {
      await trx
        .updateTable('referrals')
        .set({ status: ReferralStatus.REJECTED })
        .where('id', '=', application.referralId)
        .execute();
    }
  });

  if (reason === 'email_bounced') {
    return;
  }

  queueRejectionEmail({
    automated: true,
    email: application.email,
    firstName: application.firstName,
    reason,
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
): Promise<[true, ApplicationRejectionReason] | [false]> {
  if (application.educationLevel !== 'undergraduate') {
    return [true, 'not_undergraduate'];
  }

  const currentYear = new Date().getFullYear();

  if (
    application.graduationYear < currentYear ||
    application.graduationYear > currentYear + 5
  ) {
    return [true, 'not_undergraduate'];
  }

  const memberWithSameEmail = await db
    .selectFrom('studentEmails')
    .where('email', 'ilike', application.email)
    .executeTakeFirst();

  if (memberWithSameEmail) {
    return [true, 'email_already_used'];
  }

  const postmark = getPostmarkInstance();

  const bounces = await postmark.getBounces({
    count: 1,
    emailFilter: application.email,
    inactive: true,
  });

  if (bounces.TotalCount >= 1) {
    return [true, 'email_bounced'];
  }

  return [false];
}
