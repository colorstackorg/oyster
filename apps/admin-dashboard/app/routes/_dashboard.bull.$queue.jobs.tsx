import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react';
import dayjs from 'dayjs';
import { generatePath } from 'react-router';
import { z } from 'zod';

import { Pagination, Table, type TableColumnProps } from '@oyster/ui';

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

  const url = new URL(request.url);

  const { limit, page, status } = BullSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const queue = await validateQueue(params.queue);

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const [counts, _jobs] = await Promise.all([
    status ? queue.getJobCounts(status) : queue.getJobCounts(),
    queue.getJobs(status, startIndex, endIndex),
  ]);

  const totalJobsOfStatus = status
    ? counts[status]
    : Object.values(counts).reduce((result, count) => {
        return result + count;
      }, 0);

  const timezone = getTimezone(request);

  const jobs = _jobs.map((job) => {
    const { delay, id, name, processedOn, timestamp } = job.toJSON();

    const format = 'MM/DD/YY @ h:mm:ss A';

    return {
      createdAt: dayjs(timestamp).tz(timezone).format(format),
      id: id!,
      name,

      ...(delay && {
        delayedUntil: dayjs(timestamp)
          .add(delay, 'ms')
          .tz(timezone)
          .format(format),
      }),

      ...(processedOn && {
        processedAt: dayjs(processedOn).tz(timezone).format(format),
      }),
    };
  });

  return json({
    jobs,
    limit,
    page,
    queue: queue.name,
    status,
    totalJobsOfStatus,
  });
}

export default function JobsPage() {
  return (
    <>
      <JobsTable />
      <JobsPagination />
      <Outlet />
    </>
  );
}

type JobInView = SerializeFrom<typeof loader>['jobs'][number];

function JobsTable() {
  const { jobs, queue, status } = useLoaderData<typeof loader>();
  const { search } = useLocation();

  const columns: TableColumnProps<JobInView>[] = [
    {
      displayName: 'ID',
      size: '80',
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
  const { jobs, limit, page, totalJobsOfStatus } =
    useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={jobs.length}
      page={page}
      pageSize={limit}
      totalCount={totalJobsOfStatus}
    />
  );
}
