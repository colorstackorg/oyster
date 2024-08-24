import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Link,
  type LinkProps,
  NavLink,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useLocation,
  useNavigate,
  useSubmit,
} from '@remix-run/react';
import { Plus } from 'react-feather';
import { generatePath } from 'react-router';

import { Dashboard, getIconButtonCn, Select } from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { listQueues } from '@/admin-dashboard.server';
import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const { searchParams } = new URL(request.url);

  const [queue, queues] = await Promise.all([
    params.queue ? validateQueue(params.queue) : undefined,
    listQueues(),
  ]);

  const jobCounts = queue ? await queue.getJobCounts() : undefined;

  return json({
    queue: queue?.name,
    queues,
    status: searchParams.get('status'),

    ...(jobCounts && {
      jobCounts: [
        { status: 'active', count: jobCounts.active },
        { status: 'completed', count: jobCounts.completed },
        { status: 'delayed', count: jobCounts.delayed },
        { status: 'failed', count: jobCounts.failed },
        { status: 'paused', count: jobCounts.paused },
        { status: 'waiting', count: jobCounts.waiting },
      ],
    }),
  });
}

export default function BullQueue() {
  const { jobCounts, queue, queues, status } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const location = useLocation();
  const submit = useSubmit();

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

      <div className="flex flex-col gap-2">
        <Dashboard.Subheader>
          {queue && (
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
          )}

          {queue && !!jobCounts?.length && (
            <div className="flex items-center gap-4">
              <RemixForm
                action={location.pathname}
                method="get"
                onChange={(e) => submit(e.currentTarget)}
              >
                <Select
                  defaultValue={status || ''}
                  name="status"
                  placeholder="Status..."
                  required
                  width="fit"
                >
                  {jobCounts.map(({ count, status }) => {
                    return (
                      <option key={status} value={status}>
                        {toTitleCase(status)} ({count})
                      </option>
                    );
                  })}
                </Select>
              </RemixForm>

              <Link
                className={getIconButtonCn({
                  backgroundColor: 'gray-100',
                  backgroundColorOnHover: 'gray-200',
                  size: 'sm',
                  shape: 'square',
                })}
                to={generatePath(Route['/bull/:queue/jobs/add'], { queue })}
              >
                <Plus />
              </Link>
            </div>
          )}
        </Dashboard.Subheader>

        <Outlet />
      </div>
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
