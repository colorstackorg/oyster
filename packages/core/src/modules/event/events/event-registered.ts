import type { Gender } from '@oyster/types';
import { FORMATTED_GENDER } from '@oyster/types';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function onRegisteredForEvent({
  eventId,
  studentId,
}: GetBullJobData<'event.registered'>) {
  const [student, event] = await Promise.all([
    db
      .selectFrom('students')
      .select([
        'students.email',
        'students.firstName',
        'students.gender',
        'students.graduationYear',
        'students.lastName',
        'students.number',
      ])
      .where('students.id', '=', studentId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('events')
      .select(['events.name'])
      .where('events.id', '=', eventId)
      .executeTakeFirstOrThrow(),
  ]);

  job('airtable.record.create', {
    airtableBaseId: process.env.AIRTABLE_EVENT_REGISTRATIONS_BASE_ID as string,
    airtableTableId: 'Registrations',
    data: {
      Email: student.email,
      Event: event.name,
      'First Name': student.firstName,
      'Last Name': student.lastName,
      Gender: FORMATTED_GENDER[student.gender as Gender],
      'Graduation Year': student.graduationYear.toString(),
      'Member #': student.number,
      'Registered On': new Date().toISOString(),
    },
  });
}
