import { z } from 'zod';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type Result, success } from '@/shared/utils/core';

const HelpRequest = z.object({
  description: z.string().trim().min(1),
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
