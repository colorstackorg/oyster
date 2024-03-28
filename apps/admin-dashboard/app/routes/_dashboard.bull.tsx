import { json, LoaderFunctionArgs } from '@remix-run/node';
import { NavLink, Outlet } from '@remix-run/react';
import { generatePath } from 'react-router';

import { Dashboard } from '@oyster/feature-ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '../shared/constants';
import { BullQueue } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);
  return json({});
}

const QUEUES = Object.values(BullQueue);

export default function BullPage() {
  return (
    <>
      <header className="flex justify-between gap-4">
        <Dashboard.Title>🐂 Bull</Dashboard.Title>
      </header>

      <div className="@4xl:grid-cols-[200px,1fr] grid grid-cols-1 gap-6">
        <ul className="@4xl:sticky @4xl:top-0 @4xl:border-r @4xl:border-r-gray-200 flex h-fit flex-col gap-4 p-2">
          {QUEUES.map((queue) => {
            return (
              <li key={queue}>
                <NavLink
                  className="link [&.active]:text-primary text-black"
                  to={generatePath(Route.BULL_QUEUE, { queue })}
                >
                  {toTitleCase(queue)}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="@container flex flex-col gap-[inherit] overflow-scroll">
          <Outlet />
        </div>
      </div>
    </>
  );
}
