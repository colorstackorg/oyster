import dayjs from 'dayjs';

import { db } from '@oyster/db';
import { MemberStatus } from '@oyster/types';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';

type UploadOnboardingSessionInput = {
  attendees: string[];
  date: string;
  uploadedById: string;
};

export async function uploadOnboardingSession(
  input: UploadOnboardingSessionInput
) {
  const onboardingSessionId = id();

  const attendees = await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('onboardingSessions')
      .values({
        date: input.date,
        id: onboardingSessionId,
        uploadedById: input.uploadedById,
      })
      .execute();

    await Promise.all(
      input.attendees.map(async (studentId) => {
        await trx
          .updateTable('students')
          .set({ onboardedAt: dayjs(input.date).hour(12).toDate() })
          .where('id', '=', studentId)
          .where('onboardedAt', 'is', null)
          .execute();

        await trx
          .insertInto('onboardingSessionAttendees')
          .values({
            id: id(),
            sessionId: onboardingSessionId,
            studentId,
          })
          .execute();
      })
    );

    return trx
      .selectFrom('students')
      .select(['email', 'id', 'slackId'])
      .where('id', 'in', input.attendees)
      .execute();
  });

  await Promise.all(
    attendees.map(async (attendee) => {
      const currentStudent = await db
        .selectFrom('students')
        .select(['airtableId', 'email', 'firstName', 'slackId', 'status'])
        .where('id', '=', attendee.id)
        .executeTakeFirstOrThrow();

      const isBulkRemoved = currentStudent.status === MemberStatus.BULK_REMOVED;

      if (isBulkRemoved) {
        job('student.batch_update_status', {
          memberIds: [attendee.id],
          status: MemberStatus.ACTIVE,
        });
      } else {
        if (!attendee.slackId) {
          job('slack.invite', { email: attendee.email });
        }
      }

      job('onboarding_session.attended', {
        onboardingSessionId,
        studentId: attendee.id,
      });
    })
  );
}
