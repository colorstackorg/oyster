import dedent from 'dedent';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db, relativeTime } from '@oyster/db';
import { type ExtractValue, nullableField } from '@oyster/types';
import { id } from '@oyster/utils';

import { job, registerWorker } from '@/infrastructure/bull';
import {
  type GetBullJobData,
  PeerHelpBullJob,
} from '@/infrastructure/bull.types';
import { reportException } from '@/infrastructure/sentry';
import { ActivityType } from '@/modules/gamification/gamification.types';
import { slack } from '@/modules/slack/instances';
import { STUDENT_PROFILE_URL } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core';

export const HelpRequestStatus = {
  COMPLETED: 'completed',
  IN_PROGRESS: 'in_progress',
  NOT_COMPLETED: 'not_completed',
  OPEN: 'open',
} as const;

export type HelpRequestStatus = ExtractValue<typeof HelpRequestStatus>;

export const HelpRequestType = {
  CAREER_ADVICE: 'career_advice',
  MOCK_INTERVIEW: 'mock_interview',
  RESUME_REVIEW: 'resume_review',
} as const;

export type HelpRequestType = ExtractValue<typeof HelpRequestType>;

const HelpRequest = z.object({
  description: z.string().trim().min(1),
  helpeeId: z.string().trim().min(1),
  helpeeFeedback: z.string().trim().min(1).nullable(),
  helperId: z.string().trim().min(1).nullable(),
  id: z.string().trim().min(1),
  status: z.nativeEnum(HelpRequestStatus),
  type: z.nativeEnum(HelpRequestType),
});

type HelpRequest = z.infer<typeof HelpRequest>;

// Delete Help Request

/**
 * Deletes a help request.
 *
 * If the member who is attempting to delete the request is not the helpee, or
 * the help request is not in the `requested` state, an error will be returned.
 *
 * @returns The ID of the help request that was deleted.
 */
export async function deleteHelpRequest(
  helpRequestId: string,
  memberId: string
): Promise<Result<Pick<HelpRequest, 'id'>>> {
  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['helpeeId', 'status'])
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  if (helpRequest.helpeeId !== memberId) {
    return fail({
      code: 403,
      error: 'You are not authorized to delete this help request.',
    });
  }

  if (helpRequest.status !== HelpRequestStatus.OPEN) {
    return fail({
      code: 400,
      error: 'Requests cannot be deleted after help is in progress.',
    });
  }

  const result = await db
    .deleteFrom('helpRequests')
    .where('id', '=', helpRequestId)
    .returning(['id'])
    .executeTakeFirstOrThrow();

  return success({ id: result.id });
}

// Edit Help Request

export const EditHelpRequestInput = HelpRequest.pick({
  description: true,
  type: true,
}).extend({
  memberId: HelpRequest.shape.helpeeId,
});

type EditHelpRequestInput = z.infer<typeof EditHelpRequestInput>;

/**
 * Edits a help request.
 *
 * If the member who is attempting to edit the request is not the helpee, or
 * the help request is not in the `requested` state, an error will be returned.
 *
 * @returns The ID of the help request that was edited.
 */
export async function editHelpRequest(
  helpRequestId: string,
  { description, memberId, type }: EditHelpRequestInput
): Promise<Result<Pick<HelpRequest, 'id'>>> {
  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['helpeeId', 'status'])
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  if (helpRequest.status !== HelpRequestStatus.OPEN) {
    return fail({
      code: 400,
      error: 'Requests cannot be edited after help is in progress.',
    });
  }

  if (helpRequest.helpeeId !== memberId) {
    return fail({
      code: 403,
      error: 'You are not authorized to edit this help request.',
    });
  }

  const result = await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('helpRequests')
      .set({
        description,
        type,
        updatedAt: new Date(),
      })
      .where('id', '=', helpRequestId)
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  return success({ id: result.id });
}

// Finish Help Request

export const FinishHelpRequestInput = z.object({
  feedback: nullableField(HelpRequest.shape.helpeeFeedback),
  memberId: HelpRequest.shape.helpeeId,
  status: z.enum([
    HelpRequestStatus.NOT_COMPLETED,
    HelpRequestStatus.COMPLETED,
  ]),
});

export type FinishHelpRequestInput = z.infer<typeof FinishHelpRequestInput>;

/**
 * Finishes a help request.
 *
 * This will update the help request status to either `completed` or
 * `not_completed` and save the helpee's feedback.
 *
 * If the member who is attempting to finish the request is not the helpee, or
 * the help request is not in the `in_progress` state, an error will be returned.
 *
 * @returns A result indicating the success or failure of the operation.
 */
export async function finishHelpRequest(
  helpRequestId: string,
  { feedback, memberId, status }: FinishHelpRequestInput
): Promise<Result> {
  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['helpeeId', 'helperId', 'status'])
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  if (helpRequest.status !== HelpRequestStatus.IN_PROGRESS) {
    return fail({
      code: 400,
      error:
        'You cannot finish a help request that is not currently in progress.',
    });
  }

  if (memberId !== helpRequest.helpeeId) {
    return fail({
      code: 403,
      error: 'You are not authorized to finish this help request.',
    });
  }

  await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('helpRequests')
      .set({
        finishedAt: new Date(),
        helpeeFeedback: feedback,
        status,
        updatedAt: new Date(),
      })
      .where('id', '=', helpRequestId)
      .executeTakeFirstOrThrow();
  });

  job('gamification.activity.completed', {
    helpRequestId,
    studentId: helpRequest.helperId as string,
    type: 'help_peer',
  });

  return success({});
}

// Offer Help Request

const OfferHelpRequestInput = z.object({
  memberId: HelpRequest.shape.helperId,
});

type OfferHelpRequestInput = z.infer<typeof OfferHelpRequestInput>;

/**
 * Offers help for a given help request.
 *
 * This will start a Slack group DM between the helpee and helper, send an
 * introduction message, and update the help request status to `in_progress`.
 * Both the helpee and helper must have their Slack accounts linked to their
 * profiles in order for this to succeed.
 *
 * @returns The ID of the help request that was offered.
 */
export async function offerHelp(
  helpRequestId: string,
  { memberId }: OfferHelpRequestInput
): Promise<Result> {
  const [helpRequest, helper] = await Promise.all([
    db
      .selectFrom('helpRequests')
      .leftJoin('students as helpees', 'helpRequests.helpeeId', 'helpees.id')
      .select([
        'helpRequests.helperId',
        'helpRequests.inProgressAt',
        'helpees.slackId as helpeeSlackId',
      ])
      .where('helpRequests.id', '=', helpRequestId)
      .executeTakeFirstOrThrow(),

    db
      .selectFrom('students')
      .select('slackId')
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow(),
  ]);

  if (helpRequest.helperId || helpRequest.inProgressAt) {
    return fail({
      code: 400,
      error: 'Help is already in progress for this request.',
    });
  }

  if (!helper.slackId) {
    return fail({
      code: 400,
      error:
        'Could not accept help request because your Slack account is not linked to your profile. ' +
        'Please reach out to an admin to get this resolved.',
    });
  }

  if (!helpRequest.helpeeSlackId) {
    return fail({
      code: 400,
      error:
        'Help cannot be offered because the "helpee" does not have a linked Slack account. ' +
        'Please reach out to an admin to get this resolved.',
    });
  }

  // Next, we send a notification via group DM. As long as this succeeds, then
  // we can proceed in updating the help request.

  const notificationResult = await sendHelpRequestIntroduction({
    helpeeSlackId: helpRequest.helpeeSlackId,
    helperSlackId: helper.slackId,
    helpRequestId,
  });

  if (!notificationResult.ok) {
    reportException(notificationResult);

    return fail({
      code: 500,
      error: `Failed to send help request introduction. ${notificationResult.error}`,
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .updateTable('helpRequests')
      .set({
        helperId: memberId,
        inProgressAt: new Date(),
        slackChannelId: notificationResult.data.slackChannelId,
        status: HelpRequestStatus.IN_PROGRESS,
        updatedAt: new Date(),
      })
      .where('id', '=', helpRequestId)
      .executeTakeFirstOrThrow();
  });

  return success({});
}

type SendHelpRequestIntroductionInput = {
  helpeeSlackId: string;
  helperSlackId: string;
  helpRequestId: string;
};

async function sendHelpRequestIntroduction({
  helpeeSlackId,
  helperSlackId,
  helpRequestId,
}: SendHelpRequestIntroductionInput): Promise<
  Result<{ slackChannelId: string }>
> {
  // To get the channel of a group DM, we need to pass in all the users in the
  // group DM separated by commas.
  const slackIds = [helpeeSlackId, helperSlackId].join(',');

  const { channel } = await slack.conversations.open({
    users: slackIds,
  });

  if (!channel || !channel.id) {
    return fail({
      code: 500,
      context: { helpeeSlackId, helperSlackId },
      error: 'Failed to create (or get) group DM.',
    });
  }

  const message = dedent`
    Hi, <@${helpeeSlackId}>! <@${helperSlackId}> has graciously accepted your <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> for help. 🎉

    *Here are your next steps*:
     1.  Confirm whether you want to meet up synchronously or asynchronously _(ie: offline, via messaging in this chat)_. 💬
     2.  If synchronously, decide on a time to meet. The sooner the better. Be sure to mention your time zone. 🕐
     3.  <@${helpeeSlackId}> Share any additional details about your request. ✏️
     4.  <@${helperSlackId}> Well...help <@${helpeeSlackId}> out! 🤝
     5.  <@${helpeeSlackId}> *AFTER* you've been helped, finish off the request <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}/finish|here> (don't make us bother you with reminders). 😂

    Remember that this is meant to be a quick process. This should ideally be done in less than 48 hours and no more than 7 days!

    Thank you both! 💚
  `;

  job('notification.slack.send', {
    channel: channel.id,
    message,
    workspace: 'regular',
  });

  return success({ slackChannelId: channel.id });
}

// Request Help

export const RequestHelpInput = HelpRequest.pick({
  description: true,
  type: true,
}).extend({
  memberId: z.string().trim().min(1),
});

type RequestHelpInput = z.infer<typeof RequestHelpInput>;

/**
 * Requests help from other ColorStack members. This simply adds the request
 * to the database and initializes the status as `requested`.
 *
 * @returns The ID of the help request.
 */
export async function requestHelp({
  description,
  memberId,
  type,
}: RequestHelpInput): Promise<Result<Pick<HelpRequest, 'id'>>> {
  const helpRequest = await db.transaction().execute(async (trx) => {
    return trx
      .insertInto('helpRequests')
      .values({
        description,
        helpeeId: memberId,
        id: id(),
        status: HelpRequestStatus.OPEN,
        type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  return success({ id: helpRequest.id });
}

// Send Finish Reminder

/**
 * Sends a reminder to the helpees of all help requests that are `in_progress`
 * but not finished. We'll send a reminder after 2 days, 7 days, and 14 days.
 * There will be a maximum of 3 reminders sent.
 */
async function sendFinishReminder(
  _: GetBullJobData<'peer_help.finish_reminder'>
): Promise<Result> {
  // Get all the help requests that are in the `in_progress` state and have not
  // been finished yet...we want to remind them after a certain amount of time.
  const query = db
    .selectFrom('helpRequests')
    .innerJoin('students as helpees', 'helpRequests.helpeeId', 'helpees.id')
    .innerJoin('students as helpers', 'helpRequests.helperId', 'helpers.id')
    .select([
      'helpees.slackId as helpeeSlackId',
      'helpers.slackId as helperSlackId',
      'helpRequests.id',
      'helpRequests.slackChannelId',
    ])
    .where('helpRequests.status', '=', HelpRequestStatus.IN_PROGRESS)
    .where('helpRequests.finishedAt', 'is', null);

  const [activity, ...allHelpRequests] = await Promise.all([
    db
      .selectFrom('activities')
      .select(['id', 'points'])
      .where('type', '=', ActivityType.HELP_PEER)
      .executeTakeFirst(),

    query
      .where('inProgressAt', '<=', relativeTime("now() - interval '2 days'"))
      .where('finishNotificationCount', '=', 0)
      .execute(),

    query
      .where('inProgressAt', '<=', relativeTime("now() - interval '7 days'"))
      .where('finishNotificationCount', '=', 1)
      .execute(),

    query
      .where('inProgressAt', '<=', relativeTime("now() - interval '14 days'"))
      .where('finishNotificationCount', '=', 2)
      .execute(),
  ]);

  // It doesn't matter which of the above queries the help request belongs to,
  // we just want to send the reminder.
  const helpRequests = allHelpRequests.flat();

  console.log(
    `Sending ${helpRequests.length} help request "finish" reminders...`
  );

  if (!helpRequests.length) {
    return success({});
  }

  for (const helpRequest of helpRequests) {
    const pointsMessage = activity ? `${activity.points} points` : 'points';

    const message = dedent`
      <@${helpRequest.helpeeSlackId}> Please let us know if you've been able to receive help <${STUDENT_PROFILE_URL}/peer-help/${helpRequest.id}/finish|*HERE*>! Once you respond, <@${helpRequest.helperSlackId}> will be rewarded with ${pointsMessage}. 👀
    `;

    job('notification.slack.send', {
      channel: helpRequest.slackChannelId as string,
      message,
      workspace: 'regular',
    });
  }

  const ids = helpRequests.map((helpRequest) => {
    return helpRequest.id;
  });

  await db
    .updateTable('helpRequests')
    .set((eb) => {
      return {
        // Technically we really shouldn't increment this until we know for
        // certain that the Slack notification was sent successfully, but
        // there's not too much harm by being optimistic here.
        finishNotificationCount: eb('finishNotificationCount', '+', 1),
        updatedAt: new Date(),
      };
    })
    .where('id', 'in', ids)
    .execute();

  return success({});
}

// Worker

export const peerHelpWorker = registerWorker(
  'peer_help',
  PeerHelpBullJob,
  async (job) => {
    const result = await match(job)
      .with({ name: 'peer_help.finish_reminder' }, ({ data }) => {
        return sendFinishReminder(data);
      })
      .exhaustive();

    if (!result.ok) {
      throw new Error(result.error);
    }

    return result.data;
  }
);
