import { getQueue, listQueueNames } from '@/admin-dashboard.server';

/**
 * Validates a queue name and returns the corresponding queue instance.
 *
 * This is intended to be used within loaders/actions to validate the `queue`
 * name parameter.
 *
 * @param queueName - The name of the queue to validate.
 * @returns The corresponding queue instance.
 */
export async function validateQueue(queueName: unknown) {
  const name = queueName as string;
  const queueNames = await listQueueNames();

  if (!queueNames.includes(name)) {
    throw new Response(null, {
      status: 404,
      statusText: 'Queue not found.',
    });
  }

  const queue = getQueue(name);

  return queue;
}
