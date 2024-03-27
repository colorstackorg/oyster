import dayjs from 'dayjs';

import { id } from '@colorstack/utils';

import { job } from '@/infrastructure/bull/use-cases/job';
import { db } from '@/infrastructure/database';

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

  await db.transaction().execute(async (trx) => {
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
  });

  input.attendees.forEach((studentId) => {
    job('onboarding_session.attended', {
      onboardingSessionId,
      studentId,
    });
  });
}
