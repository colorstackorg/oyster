import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import { match } from 'ts-pattern';

import { db } from '@oyster/db';
import { Modal, Pill, Text } from '@oyster/ui';
import { toTitleCase } from '@oyster/utils';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const helpRequest = await db
    .selectFrom('helpRequests')
    .select([
      'helpRequests.description',
      'helpRequests.helpeeId',
      'helpRequests.helperId',
      'helpRequests.id',
      'helpRequests.status',
      'helpRequests.summary',
      'helpRequests.type',
    ])
    .where('id', '=', params.id as string)
    .executeTakeFirstOrThrow();

  if (!helpRequest) {
    throw new Response(null, {
      status: 404,
      statusText: 'The help request you are looking for does not exist.',
    });
  }

  return json(helpRequest);
}

export default function HelpRequestModal() {
  const { description, type } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>
          Help Request for{' '}
          <Pill
            color={match(type)
              .with('career_advice', () => 'pink-100' as const)
              .with('resume_review', () => 'blue-100' as const)
              .with('mock_interview', () => 'purple-100' as const)
              .otherwise(() => 'gray-100' as const)}
          >
            {toTitleCase(type)}
          </Pill>
        </Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Text color="gray-500">{description}</Text>
    </Modal>
  );
}
