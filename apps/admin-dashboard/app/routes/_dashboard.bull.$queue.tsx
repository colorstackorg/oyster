import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  type LinkProps,
  NavLink,
  Outlet,
  useLoaderData,
  useNavigate,
} from '@remix-run/react';
import { generatePath } from 'react-router';

import { Dashboard, Select } from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { listQueues } from '@/admin-dashboard.server';
import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const [queue, queues] = await Promise.all([
    validateQueue(params.queue),
    listQueues(),
  ]);

  return json({
    queue: queue.name,
    queues,
  });
}

export default function BullQueue() {
  const { queue, queues } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>🐂 Bull</Dashboard.Title>

        <Select
          defaultValue={queue}
          onChange={(e) => {
            navigate(
              generatePath(Route['/bull/:queue/jobs'], {
                queue: e.currentTarget.value,
              })
            );
          }}
          required
          width="fit"
        >
          {queues.map((queue) => {
            return (
              <option key={queue} value={queue}>
                {toTitleCase(queue)}
              </option>
            );
          })}
        </Select>
      </Dashboard.Header>

      <Dashboard.Subheader>
        <ul className="flex w-fit gap-4 rounded-lg">
          <BullNavigationItem
            to={generatePath(Route['/bull/:queue/jobs'], { queue })}
          >
            Jobs
          </BullNavigationItem>

          <BullNavigationItem
            to={generatePath(Route['/bull/:queue/repeatables'], { queue })}
          >
            Repeatables
          </BullNavigationItem>
        </ul>

        <Outlet context="subheader" />
      </Dashboard.Subheader>

      <Outlet context="main" />
    </>
  );
}

function BullNavigationItem({ children, to }: LinkProps) {
  return (
    <li>
      <NavLink className="link text-black [&.active]:text-primary" to={to}>
        {children}
      </NavLink>
    </li>
  );
}
