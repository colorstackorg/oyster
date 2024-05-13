import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

export async function onOnboardingSessionAttended({
  onboardingSessionId,
  studentId,
}: GetBullJobData<'onboarding_session.attended'>) {
  const student = await db
    .selectFrom('students')
    .select(['email', 'firstName'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  job('student.activation_requirement_completed', {
    requirement: 'attend_onboarding',
    studentId,
  });

  const otherAttendees = await db
    .selectFrom('onboardingSessionAttendees')
    .leftJoin('students', 'students.id', 'onboardingSessionAttendees.studentId')
    .leftJoin('schools', 'schools.id', 'students.schoolId')
    .select([
      'students.email',
      'students.firstName',
      'students.lastName',
      'students.graduationYear',
      'students.id',
      'students.linkedInUrl',
      (eb) => {
        return eb.fn
          .coalesce('schools.name', 'students.otherSchool')
          .as('school');
      },
    ])
    .where('sessionId', '=', onboardingSessionId)
    .where('studentId', '!=', studentId)
    .execute();

  job('notification.email.send', {
    data: {
      firstName: student.firstName,
      studentsInSession: otherAttendees.map((attendee) => {
        return {
          fullName: `${attendee.firstName} ${attendee.lastName}`,
          graduationYear: Number(attendee.graduationYear),
          id: attendee.id!,
          linkedInUrl: attendee.linkedInUrl!,
          school: attendee.school!,
        };
      }),
    },
    name: 'student-attended-onboarding',
    to: student.email,
  });
}
