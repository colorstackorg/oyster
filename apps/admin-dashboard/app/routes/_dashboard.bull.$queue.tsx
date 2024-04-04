import { json, LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, NavLink, Outlet, useLoaderData } from '@remix-run/react';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { ExtractValue } from '@oyster/types';

import { Route } from '../shared/constants';
import { BullQueue } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

const BullType = {
  JOB: 'job',
  REPEATABLE: 'repeatable',
} as const;

type BullType = ExtractValue<typeof BullType>;

const BullParams = z.object({
  queue: z.nativeEnum(BullQueue),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const paramsResult = BullParams.safeParse(params);

  if (!paramsResult.success) {
    throw new Response(null, { status: 404 });
  }

  const { queue } = paramsResult.data;

  return json({
    queue,
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
    .with('repeatable', () => Route.BULL_REPEATABLES)
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
