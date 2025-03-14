import { db } from '@oyster/db';
import { type Event } from '@oyster/types';
import { listEventAttendees } from '@/member-profile.server';
import { sendEmail } from '@/modules/notification/use-cases/send-email';
import { StudentActivatedEmail } from '@oyster/email-templates';
export async function eventReminder(input: Event) {
  
  //selects students who are undergrad
  let RegisteredStudentIDs: string[] = [];
  const eventAttendees = await listEventAttendees({
    select: ['eventAttendees.studentId', 'students.email'],
    where: {
      eventId: input.id,
    },
  });
  
  //extract student id for the event attendee
  eventAttendees.forEach((attendee) => {
    if (attendee.studentId) {
      RegisteredStudentIDs.push(attendee.studentId);
    }
  });
  
  //filter down to just the undergrads that are not register for the event
  const unregisteredStudents = await db
    .selectFrom('students')
    .select(['students.email', 'students.firstName'])
    .where('educationLevel', '=', 'undergraduate')
    .where('id', 'not in', RegisteredStudentIDs)
    .execute();

  //Must change the name of the email template being used based on the prupose of the function
  //TODO: create an email tenplate for event reminders
  unregisteredStudents.forEach((student) => {
    sendEmail({
      name: 'application-accepted',
      to: student.email,
      data: {
        firstName: student.firstName,
      },
    });
  });
}
