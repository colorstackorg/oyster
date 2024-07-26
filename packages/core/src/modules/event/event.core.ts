import { sql } from 'kysely';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

type CheckIntoEventInput = {
  eventId: string;
  memberId: string;
};

export async function checkIntoEvent({
  eventId,
  memberId,
}: CheckIntoEventInput) {
  const isNewCheckIn = await db.transaction().execute(async (trx) => {
    const member = await trx
      .selectFrom('students')
      .select(['email', 'firstName', 'lastName'])
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow();

    const record = await trx
      .insertInto('eventAttendees')
      .values({
        email: member.email,
        eventId,
        name: member.firstName + ' ' + member.lastName,
        studentId: memberId,
      })
      .returning(sql<boolean>`xmax = 0`.as('inserted'))
      .onConflict((oc) => oc.doNothing())
      .executeTakeFirstOrThrow();

    return record.inserted;
  });

  if (isNewCheckIn) {
    job('event.attended', {
      eventId,
      studentId: memberId,
    });
  }
}
