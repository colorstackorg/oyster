import dedent from 'dedent';
import { z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { job } from '@/infrastructure/bull';
import { slack } from '@/modules/slack/instances';
import { STUDENT_PROFILE_URL } from '@/shared/env';
import { fail, type Result, success } from '@/shared/utils/core';

const HelpRequest = z.object({
  description: z.string().trim().min(1),
  helpeeId: z.string().trim().min(1),
  helperId: z.string().trim().min(1).nullable(),
  id: z.string().trim().min(1),
  status: z.enum(['complete', 'incomplete', 'open', 'pending']),
  summary: z.string().trim().min(1),
  type: z.enum(['career_advice', 'mock_interview', 'resume_review']),
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
    .updateTable('helpRequests')
    .set({
      helperId,
      status: 'pending',
      updatedAt: new Date(),
    })
    .returning(['helpeeId', 'helperId'])
    .where('id', '=', helpRequestId)
    .executeTakeFirstOrThrow();

  // Send a notification via group DM.

  const result = await sendHelpRequestIntroduction({
    helpeeId: helpRequest.helpeeId,
    helperId: helpRequest.helperId,
    id: helpRequestId,
  });

  if (!result.ok) {
    return result;
  }

  return success({});
}

async function sendHelpRequestIntroduction({
  helpeeId,
  helperId,
  id: helpRequestId,
}: Pick<HelpRequest, 'helpeeId' | 'helperId' | 'id'>): Promise<Result> {
  const members = await db
    .selectFrom('students')
    .select('slackId')
    .where('id', 'in', [helpeeId, helperId])
    .where('slackId', 'is not', null)
    .execute();

  if (members.length !== 2) {
    return fail({
      code: 400,
      context: { helpeeId, helperId },
      error: 'One of the members involved does not have a linked Slack ID.',
    });
  }

  const slackIds = members.map((member) => member.slackId).join(',');

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
    Hi, <@${helpeeId}>!

    Good news! <@${helperId}> has graciously accepted your <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> for help.

    In terms of next steps, first, decide if you want to do a synchronous meetup or asynchronous.

    If you decide on a synchronous meetup...
    1. Decide on a time to meet (the sooner the better).

    If you decide on asynchronous...
    1. <@${helpeeId}>, send over any clarifying/additional points for your request (or confirm that it's all in the request description).
    2. <@${helperId}>, acknowledge the message and say you'll get back to them soon.

    After this request has been fulfilled, please take a moment to confirm this in the <${STUDENT_PROFILE_URL}/peer-help/${helpRequestId}|request> page.

    If you have any questions, feel free to reach out to me.

    Best,
    ColorStack
  `;

  job('notification.slack.send', {
    channel: channel.id as string,
    message,
    workspace: 'regular',
  });

  return success({});
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
