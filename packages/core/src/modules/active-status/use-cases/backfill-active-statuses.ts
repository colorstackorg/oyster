import dayjs from 'dayjs';

import type { StudentActiveStatus } from '@oyster/types';

import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

export async function backfillActiveStatuses({
  studentId,
}: GetBullJobData<'student.statuses.backfill'>) {
  const student = await db
    .selectFrom('students')
    .select(['acceptedAt', 'id'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  const todayObject = dayjs().startOf('day');

  const statuses: StudentActiveStatus[] = [];

  // We'll start from a week after the student was accepted, so
  // that we're only backfilling statuses for the student when they are
  // given the chance to be active.
  let nextDate = dayjs(student.acceptedAt).add(1, 'week');

  const [slackMessages, slackReactions] = await Promise.all([
    db
      .selectFrom('slackMessages')
      .select(['createdAt'])
      .where('studentId', '=', student.id)
      .execute(),

    db
      .selectFrom('slackReactions')
      .select(['createdAt'])
      .where('studentId', '=', student.id)
      .execute(),
  ]);

  while (nextDate.endOf('week').isBefore(todayObject)) {
    const startDateObject = nextDate.startOf('week');
    const startDate = startDateObject.toDate();

    const endDateObject = startDateObject.endOf('week');
    const endDate = endDateObject.toDate();

    const slackMessage = slackMessages.find((entity) => {
      return entity.createdAt >= startDate && entity.createdAt <= endDate;
    });

    const slackReaction = slackReactions.find((entity) => {
      return entity.createdAt >= startDate && entity.createdAt <= endDate;
    });

    const _status = slackMessage || slackReaction ? 'active' : 'inactive';

    // The date of the status is the "end" of the period, so it will
    // technically be the date after the period. For example, if the
    // period is 2023-06-18 00:00:000 to 2023-06-24 23:59:59, the status
    // date will be 2023-06-25.
    const date = startDateObject.add(1, 'week').format('YYYY-MM-DD');

    statuses.push({
      date,
      status: _status,
      studentId: student.id,
    });

    nextDate = nextDate.add(1, 'week');
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('studentActiveStatuses')
      .values(statuses)
      .onConflict((oc) => {
        return oc.columns(['date', 'studentId']).doUpdateSet((eb) => {
          return {
            status: eb.ref('excluded.status'),
          };
        });
      })
      .execute();
  });
}
