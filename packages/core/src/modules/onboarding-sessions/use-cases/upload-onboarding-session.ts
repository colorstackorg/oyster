import dayjs from 'dayjs';

import { db } from '@oyster/db';
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

  attendees.forEach((attendee) => {
    job('onboarding_session.attended', {
      onboardingSessionId,
      studentId: attendee.id,
    });

    if (!attendee.slackId) {
      job('slack.invite', { email: attendee.email });
    }
  });
}
