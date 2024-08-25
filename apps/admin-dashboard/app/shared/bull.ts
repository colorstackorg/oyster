import { z } from 'zod';

import { getQueue, listQueueNames } from '@/admin-dashboard.server';

const BullQueueParams = z.object({
  queue: z
    .string()
    .refine(async (value) => {
      const queueNames = await listQueueNames();

      return queueNames.includes(value);
    })
    .transform((value) => {
      return getQueue(value);
    }),
});

export async function validateQueue(queueName: unknown) {
  queueName = queueName as string;

  const result = await BullQueueParams.safeParseAsync({
    queue: queueName,
  });

  if (!result.success) {
    throw new Response(null, {
      status: 404,
      statusText: 'Queue not found.',
    });
  }

  return result.data.queue;
}
