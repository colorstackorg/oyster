import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';
import {
  generatePath,
  type LoaderFunctionArgs,
  type Params,
  useLoaderData,
  useParams,
} from 'react-router';

import { Modal, Text } from '@oyster/ui';

import { validateQueue } from '@/shared/bull';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const job = await getJobFromParams(params);

  if (!job) {
    throw new Response(null, { status: 404 });
  }

  const state = await job.getState();

  const timezone = getTimezone(request);

  const {
    attemptsMade,
    data,
    delay,
    failedReason,
    finishedOn,
    id,
    name,
    opts,
    processedOn,
    returnvalue,
    timestamp,
  } = job.toJSON();

  const format = 'MM/DD/YY @ h:mm:ss A';

  return {
    data,
    general: {
      id,
      name,
      state,
      createdAt: dayjs(timestamp).tz(timezone).format(format),
      ...(delay && {
        delayedUntil: dayjs(timestamp)
          .add(delay, 'ms')
          .tz(timezone)
          .format(format),
      }),
      ...(processedOn && {
        processedAt: dayjs(processedOn).tz(timezone).format(format),
      }),
      ...(finishedOn && {
        finishedAt: dayjs(finishedOn).tz(timezone).format(format),
      }),
      attemptsMade,
      failedReason,
    },
    options: opts,
    result: returnvalue,
  };
}

async function getJobFromParams(params: Params<string>) {
  const queue = await validateQueue(params.queue);

  const job = await queue.getJob(params.id as string);

  if (!job) {
    throw new Response(null, { status: 404 });
  }

  return job;
}

export default function JobPage() {
  const { data, general, options, result } = useLoaderData<typeof loader>();
  const { queue } = useParams();

  return (
    <Modal
      onCloseTo={generatePath(Route['/bull/:queue'], {
        queue: queue as string,
      })}
    >
      <Modal.Header>
        <Modal.Title>Job Details</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <JobSection>
        <JobSectionTitle>General</JobSectionTitle>
        <JobSectionData data={general} />
      </JobSection>

      <JobSection>
        <JobSectionTitle>Data</JobSectionTitle>
        <JobSectionData data={data} />
      </JobSection>

      <JobSection>
        <JobSectionTitle>Result</JobSectionTitle>
        <JobSectionData data={result} />
      </JobSection>

      <JobSection>
        <JobSectionTitle>Options</JobSectionTitle>
        <JobSectionData data={options} />
      </JobSection>
    </Modal>
  );
}

function JobSection({ children }: PropsWithChildren) {
  return <div className="flex flex-col gap-4">{children}</div>;
}

function JobSectionData({ data }: { data: object }) {
  return (
    <pre className="overflow-hidden text-ellipsis rounded-lg bg-gray-100 p-4">
      <code className="text-gray-500">{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}

function JobSectionTitle({ children }: PropsWithChildren) {
  return <Text variant="lg">{children}</Text>;
}

export function ErrorBoundary() {
  return <Text>Could not find job.</Text>;
}
