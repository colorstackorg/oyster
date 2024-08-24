import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import {
  generatePath,
  type Params,
  Form as RemixForm,
  useLoaderData,
  useParams,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { type PropsWithChildren } from 'react';
import { ArrowUp, Copy, RefreshCw, Trash } from 'react-feather';
import { match } from 'ts-pattern';
import { z } from 'zod';

import { IconButton, Modal, Text } from '@oyster/ui';

import { validateQueue } from '@/routes/_dashboard.bull.$queue';
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
    timestamp,
  } = job.toJSON();

  const format = 'MM/DD/YY @ h:mm:ss A';

  return json({
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
  });
}

const JobAction = {
  DUPLICATE: 'duplicate',
  PROMOTE: 'promote',
  REMOVE: 'remove',
  RETRY: 'retry',
} as const;

export async function action({ params, request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const form = await request.formData();

  const result = z
    .nativeEnum(JobAction)
    .safeParse(Object.fromEntries(form).action);

  if (!result.success) {
    throw new Response(null, { status: 400 });
  }

  const queue = await validateQueue(params.queue);
  const job = await getJobFromParams(params);

  await match(result.data)
    .with('duplicate', async () => {
      return queue.add(job.name, job.data);
    })
    .with('promote', async () => {
      return job.promote();
    })
    .with('remove', async () => {
      return job.remove();
    })
    .with('retry', async () => {
      return job.retry();
    })
    .exhaustive();

  return json({});
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
  const { data, general, options } = useLoaderData<typeof loader>();
  const { queue } = useParams();

  return (
    <Modal
      onCloseTo={generatePath(Route['/bull/:queue/jobs'], {
        queue: queue as string,
      })}
    >
      <Modal.Header>
        <Modal.Title>Job Details</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <RemixForm className="ml-auto flex gap-2" method="post">
        {general.state === 'delayed' && (
          <IconButton
            icon={<ArrowUp />}
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            name="action"
            shape="square"
            type="submit"
            value={JobAction.PROMOTE}
          />
        )}
        {general.state === 'failed' && (
          <IconButton
            icon={<RefreshCw />}
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            name="action"
            shape="square"
            type="submit"
            value={JobAction.RETRY}
          />
        )}
        {general.state === 'waiting' && (
          <IconButton
            icon={<Copy />}
            backgroundColor="gray-100"
            backgroundColorOnHover="gray-200"
            name="action"
            shape="square"
            type="submit"
            value={JobAction.DUPLICATE}
          />
        )}
        <IconButton
          icon={<Trash className="text-red-600" />}
          backgroundColor="gray-100"
          backgroundColorOnHover="gray-200"
          name="action"
          shape="square"
          type="submit"
          value={JobAction.REMOVE}
        />
      </RemixForm>

      <JobSection>
        <JobSectionTitle>General</JobSectionTitle>
        <JobSectionData data={general} />
      </JobSection>

      <JobSection>
        <JobSectionTitle>Data</JobSectionTitle>
        <JobSectionData data={data} />
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
