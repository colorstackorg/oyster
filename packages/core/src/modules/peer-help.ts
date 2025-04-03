import dayjs from 'dayjs';
import dedent from 'dedent';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
import { type ExtractValue, nullableField } from '@oyster/types';
import { id } from '@oyster/utils';

import { job, registerWorker } from '@/infrastructure/bull';
import {
  type GetBullJobData,
  PeerHelpBullJob,
} from '@/infrastructure/bull.types';
import { reportException } from '@/infrastructure/sentry';
import { slack } from '@/modules/slack/instances';
import { STUDENT_PROFILE_URL } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core';

export const HelpRequestStatus = {
  NOT_RECEIVED: 'not_received',
  OFFERED: 'offered',
  RECEIVED: 'received',
  REQUESTED: 'requested',
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

  if (helpRequest.status !== HelpRequestStatus.REQUESTED) {
    return fail({
      code: 400,
      error: 'Requests cannot be deleted after help has already been offered.',
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

  if (helpRequest.status !== HelpRequestStatus.REQUESTED) {
    return fail({
      code: 400,
      error: 'Requests cannot be edited after help has already been offered.',
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
  status: z.enum([HelpRequestStatus.NOT_RECEIVED, HelpRequestStatus.RECEIVED]),
});

export type FinishHelpRequestInput = z.infer<typeof FinishHelpRequestInput>;

/**
 * Finishes a help request.
 *
 * This will update the help request status to either `received` or
 * `not_received` and save the helpee's feedback.
 *
 * If the member who is attempting to finish the request is not the helpee, or
 * the help request is not in the `offered` state, an error will be returned.
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

  if (helpRequest.status !== HelpRequestStatus.OFFERED) {
    return fail({
      code: 400,
      error:
        'You cannot finish a help request which is not in the "offered" state.',
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
 * introduction message, and update the help request status to `offered`.
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
        'helpRequests.helpeeId',
        'helpRequests.helperId',
        'helpRequests.offeredAt',
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

  if (helpRequest.helperId || helpRequest.offeredAt) {
    return fail({
      code: 400,
      error: 'Help has already been offered for this request.',
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
        offeredAt: new Date(),
        slackChannelId: notificationResult.data.slackChannelId,
        status: HelpRequestStatus.OFFERED,
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
    Hi, <@${helpeeSlackId}>! Good news -- <@${helperSlackId}> has graciously accepted your <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> for help. 🎉

    Here are your next steps:
     1.  Confirm whether you want to meet up synchronously or if this can be done asynchronously _(ie: offline, via messaging in this chat)_. 💬
     2.  If synchronous, decide on a time to meet. The sooner the better! 🗓️
     3.  <@${helpeeSlackId}> Send over any clarifying or additional points for your request. ✏️
     4.  <@${helperSlackId}> Well...help <@${helpeeSlackId}> out! 🤝
     5.  <@${helpeeSlackId}> *AFTER* you've been helped, finish off the request <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}/finish|here> (don't make us bother you with reminders 😂).

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
        status: HelpRequestStatus.REQUESTED,
        type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();
  });

  return success({ id: helpRequest.id });
}

// Send Finish Reminder

async function sendFinishReminder(
  _: GetBullJobData<'peer_help.finish_reminder'>
) {
  const query = db
    .selectFrom('helpRequests')
    .select(['id', 'slackChannelId'])
    .where('finishedAt', 'is', null)
    .where('finishNotificationCount', '<', 3)
    .where('slackChannelId', 'is not', null);

  const allHelpRequests = await Promise.all([
    query
      .where('offeredAt', '>=', dayjs().subtract(2, 'day').toDate())
      .execute(),

    query
      .where('offeredAt', '>=', dayjs().subtract(7, 'days').toDate())
      .execute(),
  ]);

  const helpRequests = allHelpRequests.flat();

  for (const helpRequest of helpRequests) {
    const message = dedent`
    HELPEE, Please let us know if you've been able to receive help! Once you respond, HELPER will be rewarded with ColorStack HOWEVER MANY points.

      <${STUDENT_PROFILE_URL}/peer-help/${helpRequest.id}/finish>
    `;

    job('notification.slack.send', {
      channel: helpRequest.slackChannelId as string,
      message,
      workspace: 'regular',
    });
  }

  await db
    .updateTable('helpRequests')
    .set((eb) => {
      return {
        finishNotificationCount: eb('finishNotificationCount', '+', 1),
        updatedAt: new Date(),
      };
    })
    .where(
      'id',
      'in',
      helpRequests.map((helpRequest) => helpRequest.id)
    )
    .execute();
}

// Worker

export const peerHelpWorker = registerWorker(
  'peer_help',
  PeerHelpBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'peer_help.finish_reminder' }, ({ data }) => {
        return sendFinishReminder(data);
      })
      .exhaustive();
  }
);
