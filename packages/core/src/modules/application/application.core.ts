import dayjs from 'dayjs';
import { type SelectExpression, sql } from 'kysely';
import { match } from 'ts-pattern';

import { db, type DB } from '@oyster/db';
import { ApplicationStatus } from '@oyster/types';
import { iife } from '@oyster/utils';

import {
  ApplicationBullJob,
  type GetBullJobData,
} from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { reviewApplication } from './use-cases/review-application';

// Queries

// "Count Pending Applications"

export async function countPendingApplications() {
  const result = await db
    .selectFrom('applications')
    .select((eb) => eb.fn.countAll<string>().as('count'))
    .where('status', '=', ApplicationStatus.PENDING)
    .executeTakeFirstOrThrow();

  const count = Number(result.count);

  return count;
}

// "Get Application"

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

// "List Applications"

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

// Worker

export const applicationWorker = registerWorker(
  'application',
  ApplicationBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'application.accepted' }, ({ data }) => {
        return onApplicationAccepted(data);
      })
      .with({ name: 'application.created' }, ({ data }) => {
        return onApplicationCreated(data);
      })
      .with({ name: 'application.rejected' }, ({ data }) => {
        return onApplicationRejected(data);
      })
      .with({ name: 'application.review' }, ({ data }) => {
        return reviewApplication(data);
      })
      .exhaustive();
  }
);

async function onApplicationAccepted({
  applicationId,
  studentId,
}: GetBullJobData<'application.accepted'>) {
  const application = await db
    .selectFrom('applications')
    .select(['email', 'firstName'])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  job('student.created', {
    studentId,
  });

  job('notification.email.send', {
    data: { firstName: application.firstName },
    name: 'application-accepted',
    to: application.email,
  });
}

async function onApplicationCreated({
  applicationId,
}: GetBullJobData<'application.created'>) {
  const application = await db
    .selectFrom('applications')
    .select(['email', 'firstName'])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  job('notification.email.send', {
    data: { firstName: application.firstName },
    name: 'application-created',
    to: application.email,
  });

  job('application.review', { applicationId }, { delay: 1000 * 60 * 2.5 });
}

async function onApplicationRejected({
  applicationId,
  automated,
}: GetBullJobData<'application.rejected'>) {
  const application = await db
    .selectFrom('applications')
    .select(['email', 'firstName'])
    .where('id', '=', applicationId)
    .executeTakeFirstOrThrow();

  job(
    'notification.email.send',
    {
      data: { firstName: application.firstName },
      name: 'application-rejected',
      to: application.email,
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
