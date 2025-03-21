import { z } from 'zod';

import { db } from '@oyster/db';
import { ISO8601Date } from '@oyster/types';
import { id } from '@oyster/utils';

import { type Result, success } from '@/shared/utils/core';

const HelpRequest = z.object({
  description: z.string().trim().min(1),
  helpBy: ISO8601Date,
  helpeeId: z.string().trim().min(1),
  helperId: z.string().trim().min(1),
  id: z.string().trim().min(1),
  status: z.enum(['complete', 'incomplete', 'open', 'pending']),
  summary: z.string().trim().min(1),
  type: z.enum(['career_advice', 'mock_interview', 'resume_review']),
});

type HelpRequest = z.infer<typeof HelpRequest>;

// Request Help

export const RequestHelpInput = HelpRequest.pick({
  description: true,
  helpBy: true,
  helpeeId: true,
  type: true,
});

export type RequestHelpInput = z.infer<typeof RequestHelpInput>;

type RequestHelpResult = Result<Pick<HelpRequest, 'id'>>;

export async function requestHelp({
  description,
  helpBy,
  helpeeId,
  type,
}: RequestHelpInput): Promise<RequestHelpResult> {
  const result = await db.transaction().execute(async (trx) => {
    const helpRequestId = id();

    const helpRequest = await trx
      .insertInto('helpRequests')
      .values({
        description,
        helpBy,
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
