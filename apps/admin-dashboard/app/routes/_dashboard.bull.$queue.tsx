import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useLocation,
  useNavigate,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  ArrowUp,
  Copy,
  Menu,
  Plus,
  RefreshCw,
  Repeat,
  Trash2,
} from 'react-feather';
import { generatePath } from 'react-router';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { listQueueNames } from '@oyster/core/admin-dashboard/server';
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

import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

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
    listQueueNames(),
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
      const { attemptsMade, delay, id, name, processedOn, timestamp } =
        job.toJSON();

      return {
        attemptsMade,
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

const QueueAction = {
  'job.duplicate': 'job.duplicate',
  'job.promote': 'job.promote',
  'job.remove': 'job.remove',
  'job.retry': 'job.retry',
  'queue.clean': 'queue.clean',
  'queue.obliterate': 'queue.obliterate',
  'repeatable.remove': 'repeatable.remove',
} as const;

const QueueForm = z.discriminatedUnion('action', [
  z.object({
    action: z.literal(QueueAction['job.duplicate']),
    id: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal(QueueAction['job.promote']),
    id: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal(QueueAction['job.remove']),
    id: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal(QueueAction['job.retry']),
    id: z.string().trim().min(1),
  }),
  z.object({
    action: z.literal(QueueAction['queue.clean']),
  }),
  z.object({
    action: z.literal(QueueAction['queue.obliterate']),
  }),
  z.object({
    action: z.literal(QueueAction['repeatable.remove']),
    key: z.string().trim().min(1),
  }),
]);

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const queue = await validateQueue(params.queue);

  const form = await request.formData();

  const result = QueueForm.safeParse(Object.fromEntries(form));

  if (!result.success) {
    throw new Response(null, {
      status: 400,
    });
  }

  await match(result.data)
    .with({ action: 'job.duplicate' }, async ({ id }) => {
      const job = await queue.getJob(id);

      if (!job) {
        throw new Response(null, { status: 404 });
      }

      return queue.add(job.name, job.data);
    })
    .with({ action: 'job.promote' }, async ({ id }) => {
      const job = await queue.getJob(id);

      if (!job) {
        throw new Response(null, { status: 404 });
      }

      return job.promote();
    })
    .with({ action: 'job.remove' }, async ({ id }) => {
      const job = await queue.getJob(id);

      if (!job) {
        throw new Response(null, { status: 404 });
      }

      return job.remove();
    })
    .with({ action: 'job.retry' }, async ({ id }) => {
      const job = await queue.getJob(id);

      if (!job) {
        throw new Response(null, { status: 404 });
      }

      return job.retry();
    })
    .with({ action: 'queue.clean' }, async () => {
      return queue.clean(0, 0, 'completed');
    })
    .with({ action: 'queue.obliterate' }, async () => {
      await queue.obliterate();
    })
    .with({ action: 'repeatable.remove' }, async ({ key }) => {
      return queue.removeRepeatableByKey(key);
    })
    .exhaustive();

  toast(session, {
    message: 'Done!',
  });

  const init: ResponseInit = {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  };

  return result.data.action === 'queue.obliterate'
    ? redirect(Route['/bull'], init)
    : json({}, init);
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
            <Dropdown.Item>
              <RemixForm method="post">
                <button
                  name="action"
                  type="submit"
                  value={QueueAction['queue.clean']}
                >
                  <RefreshCw /> Clean Queue
                </button>
              </RemixForm>
            </Dropdown.Item>
            <Dropdown.Item>
              <RemixForm method="post">
                <button
                  name="action"
                  type="submit"
                  value={QueueAction['queue.obliterate']}
                >
                  <Trash2 /> Obliterate Queue
                </button>
              </RemixForm>
            </Dropdown.Item>
          </Dropdown.List>
        </Dropdown>
      )}
    </Dropdown.Container>
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
              <RemixForm method="post">
                <button
                  name="action"
                  type="submit"
                  value={QueueAction['repeatable.remove']}
                >
                  <Trash2 /> Remove Repeatable
                </button>

                <input type="hidden" name="key" value={id} />
              </RemixForm>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
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
      displayName: '# of Attempts',
      size: '120',
      render: (job) => job.attemptsMade,
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

  return (
    <Table
      columns={columns}
      data={jobs}
      emptyMessage="No jobs found."
      Dropdown={JobDropdown}
    />
  );
}

function JobDropdown({ id, status }: JobInView) {
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
            {status === 'failed' && (
              <Dropdown.Item>
                <RemixForm method="post">
                  <button
                    name="action"
                    type="submit"
                    value={QueueAction['job.retry']}
                  >
                    <RefreshCw /> Retry Job
                  </button>

                  <input type="hidden" name="id" value={id} />
                </RemixForm>
              </Dropdown.Item>
            )}

            <Dropdown.Item>
              <RemixForm method="post">
                <button
                  name="action"
                  type="submit"
                  value={QueueAction['job.duplicate']}
                >
                  <Copy /> Duplicate Job
                </button>

                <input type="hidden" name="id" value={id} />
              </RemixForm>
            </Dropdown.Item>

            {(status === 'delayed' || status === 'waiting') && (
              <Dropdown.Item>
                <RemixForm method="post">
                  <button
                    name="action"
                    type="submit"
                    value={QueueAction['job.promote']}
                  >
                    <ArrowUp /> Promote Job
                  </button>

                  <input type="hidden" name="id" value={id} />
                </RemixForm>
              </Dropdown.Item>
            )}

            <Dropdown.Item>
              <RemixForm method="post">
                <button
                  name="action"
                  type="submit"
                  value={QueueAction['job.remove']}
                >
                  <Trash2 /> Remove Job
                </button>

                <input type="hidden" name="id" value={id} />
              </RemixForm>
            </Dropdown.Item>
          </Dropdown.List>
        </Table.Dropdown>
      )}

      <Table.DropdownOpenButton onClick={onOpen} />
    </Dropdown.Container>
  );
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
