import dayjs from 'dayjs';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';

type AddOnboardingSessionAttendeesInput = {
  attendees: string[];
};

export async function addOnboardingSessionAttendees(
  onboardingSessionId: string,
  input: AddOnboardingSessionAttendeesInput
) {
  const onboardingSession = await db
    .selectFrom('onboardingSessions')
    .select(['date'])
    .where('id', '=', onboardingSessionId)
    .executeTakeFirstOrThrow();

  const attendees = await db.transaction().execute(async (trx) => {
    await Promise.all(
      input.attendees.map(async (studentId) => {
        await trx
          .updateTable('students')
          .set({ onboardedAt: dayjs(onboardingSession.date).hour(12).toDate() })
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
          .onConflict((oc) => oc.doNothing())
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
