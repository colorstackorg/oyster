import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useNavigate,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import { Menu, Plus, Repeat, Trash } from 'react-feather';
import { generatePath } from 'react-router';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  cx,
  Dashboard,
  Dropdown,
  IconButton,
  Pagination,
  Pill,
  Select,
  Table,
  type TableColumnProps,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { listQueues } from '@/admin-dashboard.server';
import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

const BullSearchParams = z.object({
  limit: z.coerce.number().min(10).max(100).catch(25),
  page: z.coerce.number().min(1).catch(1),
  status: z
    .enum([
      'active',
      'all',
      'completed',
      'delayed',
      'failed',
      'paused',
      'waiting',
    ])
    .catch('all'),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const [queue, queues] = await Promise.all([
    validateQueue(params.queue),
    listQueues(),
  ]);

  const { searchParams } = new URL(request.url);

  const { limit, page, status } = BullSearchParams.parse(
    Object.fromEntries(searchParams)
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const [counts, _jobs, _repeatables] = await Promise.all([
    queue.getJobCounts(),
    queue.getJobs(status === 'all' ? undefined : status, startIndex, endIndex),
    queue.getRepeatableJobs(),
  ]);

  const tz = getTimezone(request);
  const format = 'MM/DD/YY @ h:mm:ss A';

  const jobs = await Promise.all(
    _jobs.map(async (job) => {
      const { delay, id, name, processedOn, timestamp } = job.toJSON();

      return {
        createdAt: dayjs(timestamp).tz(tz).format(format),
        id: id as string,
        name,
        status: await job.getState(),

        ...(delay && {
          delayedUntil: dayjs(timestamp).add(delay, 'ms').tz(tz).format(format),
        }),

        ...(processedOn && {
          processedAt: dayjs(processedOn).tz(tz).format(format),
        }),
      };
    })
  );

  const repeatables = _repeatables.map((repeatable) => {
    return {
      id: repeatable.key,
      name: repeatable.name,
      next: dayjs(repeatable.next).tz(tz).format(format),
      pattern: repeatable.pattern,
      tz: repeatable.tz,
    };
  });

  const allJobsCount = Object.values(counts).reduce((result, count) => {
    return result + count;
  }, 0);

  return json({
    allJobsCount,
    counts: [
      { status: 'all', count: allJobsCount },
      { status: 'active', count: counts.active },
      { status: 'completed', count: counts.completed },
      { status: 'delayed', count: counts.delayed },
      { status: 'failed', count: counts.failed },
      { status: 'paused', count: counts.paused },
      { status: 'waiting', count: counts.waiting },
    ],
    filteredJobsCount: status === 'all' ? allJobsCount : counts[status],
    jobs,
    limit,
    page,
    queue: queue.name,
    queues,
    repeatables,
    status,
  });
}

export default function QueuePage() {
  const { repeatables } = useLoaderData<typeof loader>();

  return (
    <>
      <Dashboard.Header>
        <Dashboard.Title>🐂 Bull</Dashboard.Title>

        <div className="flex items-center gap-4">
          <QueueSelector />
          <QueueDropdown />
        </div>
      </Dashboard.Header>

      {!!repeatables.length && (
        <div className="mb-4">
          <RepeatablesTable />
        </div>
      )}

      <JobStatusNavigation />
      <JobsTable />
      <JobsPagination />

      <Outlet />
    </>
  );
}

function QueueSelector() {
  const { queue, queues } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  return (
    <Select
      defaultValue={queue}
      onChange={(e) => {
        navigate(
          generatePath(Route['/bull/:queue'], {
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
  );
}

function QueueDropdown() {
  const { queue } = useLoaderData<typeof loader>();
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onClick() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      <IconButton
        backgroundColor="gray-100"
        backgroundColorOnHover="gray-200"
        icon={<Menu />}
        onClick={onClick}
        shape="square"
      />

      {open && (
        <Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link
                to={generatePath(Route['/bull/:queue/jobs/add'], {
                  queue,
                })}
              >
                <Plus /> Add Job
              </Link>
            </Dropdown.Item>
            <Dropdown.Item>
              <Link
                to={generatePath(Route['/bull/:queue/repeatables/add'], {
                  queue,
                })}
              >
                <Repeat /> Add Repeatable
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
  );
}

function JobStatusNavigation() {
  const { counts, status: currentStatus } = useLoaderData<typeof loader>();
  const { search } = useLocation();

  return (
    <ul className="flex w-fit max-w-full gap-4 overflow-auto">
      {counts.map(({ count, status }) => {
        const searchParams = new URLSearchParams(search);

        searchParams.set('status', status);

        return (
          <li className="flex-shrink-0" key={status}>
            <Link
              className={cx('link', status !== currentStatus && 'text-black')}
              to={{ search: searchParams.toString() }}
            >
              {toTitleCase(status)} ({count})
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

type JobInView = SerializeFrom<typeof loader>['jobs'][number];

function JobsTable() {
  const { jobs, queue, status } = useLoaderData<typeof loader>();
  const { search } = useLocation();

  const columns: TableColumnProps<JobInView>[] = [
    {
      displayName: 'ID',
      size: '120',
      render: (job) => {
        return (
          <Link
            className="link"
            to={{
              pathname: generatePath(Route['/bull/:queue/jobs/:id'], {
                id: job.id,
                queue,
              }),
              search,
            }}
          >
            {job.id}
          </Link>
        );
      },
    },
    {
      displayName: 'Name',
      size: '280',
      render: (job) => {
        return <code className="text-sm">{job.name}</code>;
      },
    },
    {
      displayName: 'Status',
      size: '120',
      render: (job) => {
        return match(job.status)
          .with('active', () => {
            return <Pill color="blue-100">Active</Pill>;
          })
          .with('completed', () => {
            return <Pill color="lime-100">Completed</Pill>;
          })
          .with('delayed', () => {
            return <Pill color="amber-100">Delayed</Pill>;
          })
          .with('failed', () => {
            return <Pill color="red-100">Failed</Pill>;
          })
          .with('waiting', 'waiting-children', () => {
            return <Pill color="orange-100">Waiting</Pill>;
          })
          .with('prioritized', 'unknown', () => {
            return '-';
          })
          .exhaustive();
      },
    },
    {
      displayName: 'Created At',
      size: '200',
      render: (job) => job.createdAt,
    },
    {
      displayName: 'Delayed Until',
      size: '200',
      render: (job) => job.delayedUntil || '-',
      show: () => status == 'delayed',
    },
    {
      displayName: 'Processed At',
      size: '200',
      render: (job) => job.processedAt || '-',
    },
  ];

  return <Table columns={columns} data={jobs} emptyMessage="No jobs found." />;
}

function JobsPagination() {
  const { jobs, limit, page, filteredJobsCount } =
    useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={jobs.length}
      page={page}
      pageSize={limit}
      totalCount={filteredJobsCount}
    />
  );
}

type RepeatableInView = SerializeFrom<typeof loader>['repeatables'][number];

function RepeatablesTable() {
  const { repeatables } = useLoaderData<typeof loader>();

  const columns: TableColumnProps<RepeatableInView>[] = [
    {
      displayName: 'Name',
      size: '280',
      render: (repeatable) => {
        return <code className="text-sm">{repeatable.name}</code>;
      },
    },
    {
      displayName: 'Pattern',
      size: '160',
      render: (repeatable) => {
        return <code className="text-sm">{repeatable.pattern}</code>;
      },
    },
    {
      displayName: 'Next Job',
      size: '200',
      render: (repeatable) => repeatable.next,
    },
    {
      displayName: 'Timezone',
      size: '200',
      render: (repeatable) => repeatable.tz,
    },
  ];

  return (
    <Table
      columns={columns}
      data={repeatables}
      Dropdown={RepeatableDropdown}
      emptyMessage="No repeatables found."
    />
  );
}

function RepeatableDropdown({ id }: RepeatableInView) {
  const { queue } = useLoaderData<typeof loader>();
  const [open, setOpen] = useState<boolean>(false);

  function onClose() {
    setOpen(false);
  }

  function onOpen() {
    setOpen(true);
  }

  return (
    <Dropdown.Container onClose={onClose}>
      {open && (
        <Table.Dropdown>
          <Dropdown.List>
            <Dropdown.Item>
              <Link
                to={generatePath(Route['/bull/:queue/repeatables/:id/delete'], {
                  id,
                  queue,
                })}
              >
                <Trash /> Delete Repeatable
              </Link>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
}
