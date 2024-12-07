import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { ActivityType } from '@/modules/gamification/gamification.types';

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
      .onConflict((oc) => oc.doNothing())
      .executeTakeFirst();

    return !!Number(record.numInsertedOrUpdatedRows);
  });

  if (isNewCheckIn) {
    job('event.attended', {
      eventId,
      studentId: memberId,
    });
  }
}

/**
 * Deletes an event. This will also delete any associated records/data, such as:
 * - `completed_activities` (for `ActivityType.ATTEND_EVENT`)
 * - `event_attendees`
 * - `event_registrations`
 *
 * @param id - ID of the event to delete.
 */
export async function deleteEvent(id: string) {
  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('completedActivities')
      .where('type', '=', ActivityType.ATTEND_EVENT)
      .where('eventAttended', '=', id)
      .execute();

    await trx.deleteFrom('eventAttendees').where('eventId', '=', id).execute();

    await trx
      .deleteFrom('eventRegistrations')
      .where('eventId', '=', id)
      .execute();

    await trx.deleteFrom('events').where('id', '=', id).execute();
  });
}
