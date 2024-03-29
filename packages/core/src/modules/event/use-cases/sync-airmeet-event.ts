import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';
import { findMemberByEmail } from '@/modules/member/queries/find-member-by-email';
import { NotFoundError } from '@/shared/errors';
import {
  getAirmeetEvent,
  listAirmeetAttendees,
} from '../airmeet-event.service';

export async function syncAirmeetEvent({
  eventId,
}: GetBullJobData<'event.sync'>) {
  const event = await getAirmeetEvent(eventId);

  if (!event) {
    throw new NotFoundError('Event was not found.').withContext({
      eventId,
    });
  }

  // If the event has already ended, we can fetch the attendees from Airmeet,
  // otherwise, we won't import any attendees.
  const attendees =
    new Date() > event.endTime ? await listAirmeetAttendees(event.id) : [];

  const studentIds: string[] = [];

  await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('events')
      .values({
        description: event.description,
        endTime: event.endTime,
        externalLink: event.externalLink,
        id: event.id,
        name: event.name,
        startTime: event.startTime,
        type: event.type,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();

    await Promise.all(
      attendees.map(async (attendee) => {
        const student = await findMemberByEmail(attendee.email);

        await trx
          .insertInto('eventAttendees')
          .values({
            email: attendee.email,
            eventId: event.id,
            name: attendee.name,
            studentId: student?.id,
          })
          .onConflict((oc) => oc.doNothing())
          .execute();

        if (student?.id) {
          studentIds.push(student.id);
        }
      })
    );
  });

  studentIds.forEach((studentId) => {
    job('event.attended', {
      eventId: event.id,
      studentId,
    });
  });
}
