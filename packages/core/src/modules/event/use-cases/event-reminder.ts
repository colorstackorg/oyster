import { db } from '@oyster/db';
import { type Event } from '@oyster/types';
import { listEventAttendees } from '@/member-profile.server';
import { sendEmail } from '@/modules/notification/use-cases/send-email';
import { Email } from '../../../../../types/src/domain/types';
import { send } from 'process';

export async function eventReminder(input: Event) {
  //selects students who are undergrad
  let RegisteredStudentIDs: string[] = [];
  const eventAttendees = await listEventAttendees({
    select: ['eventAttendees.studentId', 'students.email'],
    where: {
      eventId: input.id,
    },
  });
  //extrack student id  for the event attendee
  eventAttendees.forEach((attendee) => {
    if (attendee.studentId) {
      RegisteredStudentIDs.push(attendee.studentId);
    }
  });
  // filter down to just the undergrads that are not register for the event
  const unregisteredStudents = await db
    .selectFrom('students')
    .select(['students.email'])
    .where('educationLevel', '=', 'undergraduate')
    .where('id', 'not in', RegisteredStudentIDs)
    .execute();
  const unregisteredStudentsEmailList = unregisteredStudents.map(
    (studentEmail) => studentEmail.email
  );
  //list of unregistered student emails
  return unregisteredStudentsEmailList;
}
