import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import { type PropsWithChildren } from 'react';

import { db } from '@oyster/db';
import { Modal, Text } from '@oyster/ui';

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
  const { id } = useLoaderData<typeof loader>();

  const [searchParams] = useSearchParams();

  return (
    <Modal
      onCloseTo={{
        pathname: Route['/peer-help'],
        search: searchParams.toString(),
      }}
    >
      <Modal.Header>
        <Modal.Title>Help Request</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Text>Help Request: {id}</Text>
    </Modal>
  );
}
