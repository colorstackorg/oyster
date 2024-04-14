import dayjs from 'dayjs';

import { type StudentActiveStatus } from '@oyster/types';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

type CreateNewActiveStatusesInput = GetBullJobData<'student.statuses.new'>;

export async function createNewActiveStatuses(_: CreateNewActiveStatusesInput) {
  const startDateObject = dayjs().subtract(1, 'week').startOf('week');
  const startDate = startDateObject.toDate();

  const endDateObject = startDateObject.endOf('week');
  const endDate = endDateObject.toDate();

  // Get all the students that were accepted before this window's start date.
  // We won't track statuses for students that have not been in ColorStack
  // for at least a week.
  const students = await db
    .selectFrom('students')
    .select(['id'])
    .where('acceptedAt', '<=', startDate)
    .execute();

  const statuses: StudentActiveStatus[] = [];

  await Promise.all(
    students.map(async (student) => {
      const [slackMessage, slackReaction] = await Promise.all([
        db
          .selectFrom('slackMessages')
          .where('studentId', '=', student.id)
          .where('createdAt', '>=', startDate)
          .where('createdAt', '<=', endDate)
          .limit(1)
          .executeTakeFirst(),

        db
          .selectFrom('slackReactions')
          .where('studentId', '=', student.id)
          .where('createdAt', '>=', startDate)
          .where('createdAt', '<=', endDate)
          .limit(1)
          .executeTakeFirst(),
      ]);

      statuses.push({
        date: startDateObject.add(1, 'week').format('YYYY-MM-DD'),
        status: slackMessage || slackReaction ? 'active' : 'inactive',
        studentId: student.id,
      });
    })
  );

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
