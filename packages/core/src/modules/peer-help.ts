import dayjs from 'dayjs';
import dedent from 'dedent';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { db } from '@oyster/db';
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
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  OPEN: 'open',
  PENDING: 'pending',
} as const;

const HelpRequestType = {
  CAREER_ADVICE: 'career_advice',
  MOCK_INTERVIEW: 'mock_interview',
  RESUME_REVIEW: 'resume_review',
} as const;

const HelpRequest = z.object({
  description: z.string().trim().min(1),
  helpeeId: z.string().trim().min(1),
  helpeeFeedback: z.string().trim().min(1),
  helperId: z.string().trim().min(1).nullable(),
  id: z.string().trim().min(1),
  status: z.nativeEnum(HelpRequestStatus),
  summary: z.string().trim().min(1),
  type: z.nativeEnum(HelpRequestType),
});

type HelpRequest = z.infer<typeof HelpRequest>;

// Accept Help Request

const AcceptHelpRequestInput = HelpRequest.pick({
  helperId: true,
});

type AcceptHelpRequestInput = z.infer<typeof AcceptHelpRequestInput>;

export async function acceptHelpRequest(
  helpRequestId: string,
  { helperId }: AcceptHelpRequestInput
): Promise<Result> {
  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['helpeeId', 'helperId'])
    .where('id', '=', helpRequestId)
    .executeTakeFirst();

  if (!helpRequest) {
    return fail({
      code: 404,
      error: 'Help request not found.',
    });
  }

  const helper = await db
    .selectFrom('students')
    .select('slackId')
    .where('id', '=', helperId)
    .executeTakeFirst();

  if (!helper || !helper.slackId) {
    return fail({
      code: 400,
      error:
        'Could not accept help request because your Slack account is not linked to your profile. ' +
        'Please reach out to an admin to get this resolved.',
    });
  }

  try {
    await db.transaction().execute(async (trx) => {
      // Send a notification via group DM.
      const notificationResult = await sendHelpRequestIntroduction({
        helpeeId: helpRequest.helpeeId,
        helperId,
        id: helpRequestId,
      });

      if (!notificationResult.ok) {
        throw new Error(notificationResult.error);
      }

      await trx
        .updateTable('helpRequests')
        .set({
          helperId,
          slackChannelId: notificationResult.data.slackChannelId,
          status: HelpRequestStatus.PENDING,
          updatedAt: new Date(),
        })
        .where('id', '=', helpRequestId)
        .executeTakeFirstOrThrow();
    });

    return success({});
  } catch (e) {
    reportException(e);

    return fail({
      code: 500,
      error: `Failed to accept help request. ${(e as Error).message}`,
    });
  }
}

async function sendHelpRequestIntroduction({
  helpeeId,
  helperId,
  id: helpRequestId,
}: Pick<HelpRequest, 'helpeeId' | 'helperId' | 'id'>): Promise<
  Result<{ slackChannelId: string }>
> {
  const [helpee, helper] = await Promise.all([
    db
      .selectFrom('students')
      .select('slackId')
      .where('id', '=', helpeeId)
      .where('slackId', 'is not', null)
      .executeTakeFirst(),

    db
      .selectFrom('students')
      .select('slackId')
      .where('id', '=', helperId)
      .where('slackId', 'is not', null)
      .executeTakeFirst(),
  ]);

  if (!helpee || !helper) {
    return fail({
      code: 400,
      context: { helpeeId, helperId },
      error: 'One of the members involved does not have a linked Slack ID.',
    });
  }

  const slackIds = [helpee.slackId, helper.slackId].join(',');

  const { channel } = await slack.conversations.open({
    users: slackIds,
  });

  if (!channel || !channel.id) {
    return fail({
      code: 500,
      context: { helpeeId, helperId },
      error: 'Failed to create a group DM.',
    });
  }

  const message = dedent`
    Hi, <@${helpee.slackId}>! Good news! -- <@${helper.slackId}> has graciously accepted your <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> for help. 🤝

    In terms of next steps, first, decide if you want to do a synchronous meetup or asynchronous.

    If you decide on a synchronous meetup...
    1. Decide on a time to meet (the sooner the better).

    If you decide on asynchronous...
    1. <@${helpee.slackId}>, send over any clarifying/additional points for your request (or confirm that it's all in the request description).
    2. <@${helper.slackId}>, acknowledge the message and say you'll get back to them soon.

    After this request has been fulfilled, please take a moment to confirm this in the <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> page.
  `;

  job('notification.slack.send', {
    channel: channel.id,
    message,
    workspace: 'regular',
  });

  return success({ slackChannelId: channel.id });
}

// Delete Help Request

export async function deleteHelpRequest(
  helpRequestId: string
): Promise<Result> {
  await db
    .deleteFrom('helpRequests')
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  return success({});
}

// Edit Help Request

export const EditHelpRequestInput = HelpRequest.pick({
  description: true,
  type: true,
});

type EditHelpRequestInput = z.infer<typeof EditHelpRequestInput>;

type EditHelpRequestResult = Result<Pick<HelpRequest, 'id'>>;

export async function editHelpRequest(
  helpRequestId: string,
  { description, type }: EditHelpRequestInput
): Promise<EditHelpRequestResult> {
  const result = await db.transaction().execute(async (trx) => {
    const helpRequest = await trx
      .updateTable('helpRequests')
      .set({
        description,
        type,
        updatedAt: new Date(),
      })
      .where('id', '=', helpRequestId)
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return helpRequest;
  });

  return success({ id: result.id });
}

// Finish Help Request

export const FinishHelpRequestInput = z.object({
  feedback: HelpRequest.shape.helpeeFeedback,
  memberId: z.string().trim().min(1),
  status: z.enum([HelpRequestStatus.COMPLETE, HelpRequestStatus.INCOMPLETE]),
});

export type FinishHelpRequestInput = z.infer<typeof FinishHelpRequestInput>;

export async function finishHelpRequest(
  helpRequestId: string,
  { feedback, memberId, status }: FinishHelpRequestInput
): Promise<Result> {
  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['helpeeId', 'helperId', 'status'])
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  if (memberId !== helpRequest.helpeeId) {
    return fail({
      code: 403,
      error: 'You are not authorized to report on this help request.',
    });
  }

  if (helpRequest.status !== 'pending') {
    return fail({
      code: 400,
      error: 'Can only report status for pending help requests.',
    });
  }

  await db
    .updateTable('helpRequests')
    .set({
      finishedAt: new Date(),
      helpeeFeedback: feedback,
      status,
      updatedAt: new Date(),
    })
    .where('id', '=', helpRequestId)
    .execute();

  job('gamification.activity.completed', {
    helpRequestId,
    studentId: helpRequest.helperId as string,
    type: 'help_peer',
  });

  return success({});
}

// Request Help

export const RequestHelpInput = HelpRequest.pick({
  description: true,
  helpeeId: true,
  type: true,
});

export type RequestHelpInput = z.infer<typeof RequestHelpInput>;

type RequestHelpResult = Result<Pick<HelpRequest, 'id'>>;

export async function requestHelp({
  description,
  helpeeId,
  type,
}: RequestHelpInput): Promise<RequestHelpResult> {
  const result = await db.transaction().execute(async (trx) => {
    const helpRequestId = id();

    const helpRequest = await trx
      .insertInto('helpRequests')
      .values({
        description,
        helpeeId,
        id: helpRequestId,
        status: 'open',
        type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return helpRequest;
  });

  return success({ id: result.id });
}

async function sendFinishNotifications(
  _: GetBullJobData<'peer_help.finish_notifications'>
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
      .with({ name: 'peer_help.finish_notifications' }, ({ data }) => {
        return sendFinishNotifications(data);
      })
      .exhaustive();
  }
);
