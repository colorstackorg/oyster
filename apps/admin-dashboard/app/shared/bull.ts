import { z } from 'zod';

import { initializeQueue, isQueue } from '@/admin-dashboard.server';

const BullQueueParams = z.object({
  queue: z
    .string()
    .refine(async (value) => {
      return isQueue(value);
    })
    .transform(async (value) => {
      return initializeQueue(value);
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
