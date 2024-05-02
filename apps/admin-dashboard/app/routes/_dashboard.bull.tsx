import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { NavLink, Outlet } from '@remix-run/react';
import { generatePath } from 'react-router';

import { Dashboard } from '@oyster/ui';
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

      <div className="grid grid-cols-1 gap-6 @4xl:grid-cols-[200px,1fr]">
        <ul className="flex h-fit flex-col gap-4 p-2 @4xl:sticky @4xl:top-0 @4xl:border-r @4xl:border-r-gray-200">
          {QUEUES.map((queue) => {
            return (
              <li key={queue}>
                <NavLink
                  className="link text-black [&.active]:text-primary"
                  to={generatePath(Route['/bull/:queue'], { queue })}
                >
                  {toTitleCase(queue)}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-[inherit] overflow-scroll @container">
          <Outlet />
        </div>
      </div>
    </>
  );
}
