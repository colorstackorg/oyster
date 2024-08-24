import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, NavLink, Outlet, useLoaderData } from '@remix-run/react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { type ExtractValue } from '@oyster/types';

import { initializeQueue, isQueue } from '@/admin-dashboard.server';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

const BullType = {
  JOB: 'job',
  REPEATABLE: 'repeatable',
} as const;

type BullType = ExtractValue<typeof BullType>;

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

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const queue = await validateQueue(params.queue);

  return json({
    queue: queue.name,
  });
}

export default function QueueLayout() {
  return (
    <>
      <ul className="flex gap-4 rounded-lg bg-gray-50 p-2">
        <TypeNavigationItem type="job" />
        <TypeNavigationItem type="repeatable" />
      </ul>

      <Outlet />
    </>
  );
}

type TypeNavigationItemProps = {
  type: BullType;
};

function TypeNavigationItem({ type }: TypeNavigationItemProps) {
  const { queue } = useLoaderData<typeof loader>();

  const basePathname = match(type)
    .with('job', () => Route['/bull/:queue/jobs'])
    .with('repeatable', () => Route['/bull/:queue/repeatables'])
    .exhaustive();

  const label = match(type)
    .with('job', () => 'Jobs')
    .with('repeatable', () => 'Repeatables')
    .exhaustive();

  return (
    <li>
      <NavLink
        className="link text-black [&.active]:text-primary"
        to={generatePath(basePathname, { queue })}
      >
        {label}
      </NavLink>
    </li>
  );
}

export function ErrorBoundary() {
  return <></>;
}
