import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useLocation,
  useOutletContext,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { Plus } from 'react-feather';
import { generatePath } from 'react-router';
import { match } from 'ts-pattern';
import { z } from 'zod';

import {
  getIconButtonCn,
  Pagination,
  Pill,
  Select,
  Table,
  type TableColumnProps,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { ListSearchParams } from '@/admin-dashboard.ui';
import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

const BullSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  status: z
    .enum(['active', 'completed', 'delayed', 'failed', 'paused', 'waiting'])
    .optional()
    .catch(undefined),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const queue = await validateQueue(params.queue);

  const { searchParams } = new URL(request.url);

  const { limit, page, status } = BullSearchParams.parse(
    Object.fromEntries(searchParams)
  );

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const [counts, _jobs] = await Promise.all([
    queue.getJobCounts(),
    queue.getJobs(status, startIndex, endIndex),
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

  return json({
    counts: [
      { status: 'active', count: counts.active },
      { status: 'completed', count: counts.completed },
      { status: 'delayed', count: counts.delayed },
      { status: 'failed', count: counts.failed },
      { status: 'paused', count: counts.paused },
      { status: 'waiting', count: counts.waiting },
    ],
    jobs,
    limit,
    page,
    queue: queue.name,
    status,

    // If there's no status, we are showing all jobs and thus we need to add
    // up all the counts.
    totalCount: status
      ? counts[status]
      : Object.values(counts).reduce((result, count) => {
          return result + count;
        }, 0),
  });
}

export default function JobsPage() {
  const context = useOutletContext<'main' | 'subheader'>();

  return (
    <>
      {context === 'subheader' && (
        <div className="flex items-center gap-4">
          <JobStatusForm />
          <AddJobButton />
        </div>
      )}

      {context === 'main' && (
        <>
          <JobsTable />
          <JobsPagination />
          <Outlet />
        </>
      )}
    </>
  );
}

function JobStatusForm() {
  const { counts, status } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  return (
    <RemixForm method="get" onChange={(e) => submit(e.currentTarget)}>
      <Select
        defaultValue={status || ''}
        name="status"
        placeholder="Status..."
        required
        width="fit"
      >
        {counts.map(({ count, status }) => {
          return (
            <option key={status} value={status}>
              {toTitleCase(status)} ({count})
            </option>
          );
        })}
      </Select>
    </RemixForm>
  );
}

function AddJobButton() {
  const { queue } = useLoaderData<typeof loader>();

  return (
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
      displayName: 'Name',
      size: '280',
      render: (job) => {
        return <code className="text-sm">{job.name}</code>;
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
  const { jobs, limit, page, totalCount } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={jobs.length}
      page={page}
      pageSize={limit}
      totalCount={totalCount}
    />
  );
}
