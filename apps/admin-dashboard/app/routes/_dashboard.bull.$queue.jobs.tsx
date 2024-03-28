import { json, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node';
import {
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useSearchParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { Plus } from 'react-feather';
import { generatePath } from 'react-router';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { ExtractValue } from '@oyster/types';
import {
  cx,
  getIconButtonCn,
  Pagination,
  Table,
  TableColumnProps,
  Text,
} from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '../shared/constants';
import { getTimezone } from '../shared/cookies.server';
import { QueueFromName } from '../shared/core.server';
import { BullQueue, ListSearchParams } from '../shared/core.ui';
import { ensureUserAuthenticated } from '../shared/session.server';

const BullStatus = {
  COMPLETED: 'completed',
  DELAYED: 'delayed',
  FAILED: 'failed',
  WAITING: 'waiting',
} as const;

type BullStatus = ExtractValue<typeof BullStatus>;

const BullParams = z.object({
  queue: z.nativeEnum(BullQueue),
});

const BullSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  status: z.nativeEnum(BullStatus).catch('completed'),
});

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const { queue: queueName } = BullParams.parse(params);

  const { limit, page, status } = BullSearchParams.parse(
    Object.fromEntries(url.searchParams)
  );

  const queue = QueueFromName[queueName];

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit - 1;

  const [
    {
      active: activeJobCount,
      completed: completedJobCount,
      delayed: delayedJobCount,
      failed: failedJobCount,
      waiting: waitingJobCount,
    },
    _jobs,
  ] = await Promise.all([
    queue.getJobCounts(),
    queue.getJobs(status, startIndex, endIndex),
  ]);

  const totalJobsOfStatus = match(status)
    .with('completed', () => completedJobCount)
    .with('delayed', () => delayedJobCount)
    .with('failed', () => failedJobCount)
    .with('waiting', () => waitingJobCount)
    .exhaustive();

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
    activeJobCount,
    completedJobCount,
    delayedJobCount,
    failedJobCount,
    jobs,
    limit,
    page,
    queue: queueName,
    status,
    totalJobsOfStatus,
    waitingJobCount,
  });
}

export default function JobsPage() {
  const {
    completedJobCount,
    delayedJobCount,
    failedJobCount,
    waitingJobCount,
    queue,
  } = useLoaderData<typeof loader>();

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 p-2">
        <ul className="flex gap-4">
          <StatusNavigationItem count={completedJobCount} status="completed" />
          <StatusNavigationItem count={waitingJobCount} status="waiting" />
          <StatusNavigationItem count={delayedJobCount} status="delayed" />
          <StatusNavigationItem count={failedJobCount} status="failed" />
        </ul>

        <div className="ml-auto">
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
      </div>

      <JobsTable />
      <JobsPagination />
      <Outlet />
    </>
  );
}

type StatusNavigationItemProps = {
  count: number;
  status: BullStatus;
};

function StatusNavigationItem({ count, status }: StatusNavigationItemProps) {
  const { status: currentStatus } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();

  searchParams.set('status', status);

  return (
    <li>
      <Link
        className={cx('link', status !== currentStatus && 'text-black')}
        to={{ search: searchParams.toString() }}
      >
        {toTitleCase(status)} ({count})
      </Link>
    </li>
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
              pathname: generatePath(Route.BULL_JOB, { id: job.id, queue }),
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

export function ErrorBoundary() {
  return <Text>Could not find queue.</Text>;
}
