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
      error: 'Failed to accept help request.',
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
    Hi, <@${helpee.slackId}>!

    Good news! <@${helper.slackId}> has graciously accepted your <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> for help.

    In terms of next steps, first, decide if you want to do a synchronous meetup or asynchronous.

    If you decide on a synchronous meetup...
    1. Decide on a time to meet (the sooner the better).

    If you decide on asynchronous...
    1. <@${helpee.slackId}>, send over any clarifying/additional points for your request (or confirm that it's all in the request description).
    2. <@${helper.slackId}>, acknowledge the message and say you'll get back to them soon.

    After this request has been fulfilled, please take a moment to confirm this in the <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> page.

    If you have any questions, feel free to reach out to me.

    Best,
    ColorStack
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

// Check Into Help Request

export const CheckIntoHelpRequestInput = z.object({
  feedback: z.string().trim().optional(),
  memberId: z.string().trim().min(1),
  status: z.enum(['met', 'havent_met', 'planning_to_meet']),
});

export type CheckIntoHelpRequestInput = z.infer<
  typeof CheckIntoHelpRequestInput
>;

export async function checkIntoHelpRequest(
  helpRequestId: string,
  { feedback, memberId, status }: CheckIntoHelpRequestInput
): Promise<Result> {
  const helpRequest = await db
    .selectFrom('helpRequests')
    .select(['helpeeId', 'helperId', 'status'])
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  if (memberId !== helpRequest.helpeeId && memberId !== helpRequest.helperId) {
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

  const respondentType =
    memberId === helpRequest.helpeeId ? 'helpee' : 'helper';

  await db
    .insertInto('helpRequestResponses')
    .values({
      feedback,
      helpRequestId,
      respondentId: memberId,
      respondentType,
      response: status,
    })
    .onConflict((oc) => {
      return oc.columns(['helpRequestId', 'respondentId']).doUpdateSet({
        feedback,
        response: status,
      });
    })
    .execute();

  // Check if both parties have responded
  const responses = await db
    .selectFrom('helpRequestResponses')
    .select('response')
    .where('helpRequestId', '=', helpRequestId)
    .execute();

  if (responses.length === 2) {
    const allMet = responses.every((r) => r.response === 'met');
    const allHaventMet = responses.every((r) => r.response === 'havent_met');
    const allPlanning = responses.every(
      (r) => r.response === 'planning_to_meet'
    );

    // Only update status if both parties agree
    if (allMet || allHaventMet) {
      const newStatus = allMet ? 'complete' : 'incomplete';

      await db
        .updateTable('helpRequests')
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where('id', '=', helpRequestId)
        .execute();

      job('gamification.activity.completed', {
        helpRequestId,
        studentId: helpRequest.helperId as string,
        type: 'help_peer',
      });
    }
  }

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
        summary: '',
        type,
      })
      .returning(['id'])
      .executeTakeFirstOrThrow();

    return helpRequest;
  });

  return success({ id: result.id });
}

async function sendCheckInNotifications(
  _: GetBullJobData<'peer_help.check_in_notifications'>
) {
  const query = db
    .selectFrom('helpRequests')
    .select(['id', 'slackChannelId'])
    .where('status', '=', HelpRequestStatus.PENDING)
    .where('checkInNotificationCount', '<', 3)
    .where('slackChannelId', 'is not', null);

  const allHelpRequests = await Promise.all([
    query
      .where('matchedAt', '>=', dayjs().subtract(2, 'day').toDate())
      .execute(),

    query
      .where('matchedAt', '>=', dayjs().subtract(7, 'days').toDate())
      .execute(),
  ]);

  const helpRequests = allHelpRequests.flat();

  for (const helpRequest of helpRequests) {
    const message = dedent`
    Please let us know if you've been able to connect with your peer! Once both you and your peer respond, you'll both be rewarded with ColorStack points.

    <${STUDENT_PROFILE_URL}/peer-help/${helpRequest.id}/check-in>
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
        checkInNotificationCount: eb('checkInNotificationCount', '+', 1),
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
      .with({ name: 'peer_help.check_in_notifications' }, ({ data }) => {
        return sendCheckInNotifications(data);
      })
      .exhaustive();
  }
);
