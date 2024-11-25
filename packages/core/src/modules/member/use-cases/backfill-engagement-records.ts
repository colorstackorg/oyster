import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { getSlackUserByEmail } from '@/modules/slack/services/slack-user.service';

type BackfillEngagementRecordsInput =
  GetBullJobData<'student.engagement.backfill'>;

export async function backfillEngagementRecords(
  input: BackfillEngagementRecordsInput
) {
  const { studentId } = input;

  const student = await db
    .selectFrom('students')
    .select(['email', 'id', 'slackId'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  const email = input.email || student.email;

  let slackId = student.slackId || null;

  // If for whatever reason, the student didn't have a `slackId` on record,
  // then we'll try to find it by their email address, then update the
  // student record. Then, we'll look for any unlinked messages with that
  // ID.
  if (!slackId) {
    const user = await getSlackUserByEmail(email);

    if (user) {
      slackId = user.id;
    }
  }

  const [
    eventAttendees,
    programParticipants,
    resourceUsers,
    slackMessages,
    slackReactions,
    surveyResponses,
  ] = await Promise.all([
    db
      .selectFrom('eventAttendees')
      .select(['email', 'eventId'])
      .where('studentId', 'is', null)
      .where('email', 'ilike', email)
      .execute(),

    db
      .selectFrom('programParticipants')
      .select(['id'])
      .where('studentId', 'is', null)
      .where('email', 'ilike', email)
      .execute(),

    db
      .selectFrom('internalResourceUsers')
      .select(['id'])
      .where('studentId', 'is', null)
      .where('email', 'ilike', email)
      .execute(),

    db
      .selectFrom('slackMessages')
      .select(['channelId', 'id'])
      .where('studentId', 'is', null)
      .where('userId', '=', slackId)
      .execute(),

    db
      .selectFrom('slackReactions')
      .select(['channelId', 'messageId', 'reaction', 'userId'])
      .where('studentId', 'is', null)
      .where('userId', '=', slackId)
      .execute(),

    db
      .selectFrom('surveyResponses')
      .select(['id', 'surveyId'])
      .where('studentId', 'is', null)
      .where('email', 'ilike', email)
      .execute(),
  ]);

  await db.transaction().execute(async (trx) => {
    await Promise.all([
      ...eventAttendees.map(async (attendee) => {
        await trx
          .updateTable('eventAttendees')
          .set({ studentId: student.id })
          .where('email', 'ilike', attendee.email)
          .where('eventId', '=', attendee.eventId)
          .execute();
      }),

      ...programParticipants.map(async (programParticipant) => {
        await trx
          .updateTable('programParticipants')
          .set({ studentId: student.id })
          .where('id', '=', programParticipant.id)
          .execute();
      }),

      ...resourceUsers.map(async (resourceUser) => {
        await trx
          .updateTable('internalResourceUsers')
          .set({ studentId: student.id })
          .where('id', '=', resourceUser.id)
          .execute();
      }),

      ...slackReactions.map(async (slackReaction) => {
        await trx
          .updateTable('slackReactions')
          .set({ studentId: student.id })
          .where('channelId', '=', slackReaction.channelId)
          .where('messageId', '=', slackReaction.messageId)
          .where('reaction', '=', slackReaction.reaction)
          .where('userId', '=', slackReaction.userId)
          .execute();
      }),

      ...slackMessages.map(async (slackMessage) => {
        await trx
          .updateTable('slackMessages')
          .set({ studentId: student.id })
          .where('channelId', '=', slackMessage.channelId)
          .where('id', '=', slackMessage.id)
          .execute();
      }),

      ...surveyResponses.map(async (response) => {
        await trx
          .updateTable('surveyResponses')
          .set({ studentId: student.id })
          .where('id', '=', response.id)
          .execute();
      }),

      trx
        .updateTable('students')
        .set({ slackId })
        .where('id', '=', student.id)
        .where('slackId', 'is', null)
        .execute(),
    ]);
  });

  eventAttendees.forEach((attendee) => {
    job('event.attended', {
      eventId: attendee.eventId,
      studentId: student.id,
    });
  });

  surveyResponses.forEach((response) => {
    job('gamification.activity.completed', {
      studentId: student.id,
      surveyRespondedTo: response.surveyId,
      type: 'respond_to_survey',
    });
  });

  if (slackMessages.length) {
    job('student.activation_requirement_completed', {
      studentId: student.id,
    });
  }

  if (slackMessages.length || slackReactions.length) {
    job('student.statuses.backfill', {
      studentId: student.id,
    });
  }
}
