import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { getOysterContributorStats } from '@oyster/core/github';
import { Modal, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const stats = await getOysterContributorStats();

  return json(stats);
}

export default function OysterContributorsModal() {
  const {
    totalContributors,
    uniqueContributorsChore,
    uniqueContributorsDocs,
    uniqueContributorsFeature,
    uniqueContributorsFix,
  } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/']}>
      <Modal.Header>
        <Modal.Title>Oyster (GitHub) Contributions</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <div className="flex flex-col gap-2">
        <Text>Unique Contributors (Chore): {uniqueContributorsChore}</Text>
        <Text>Unique Contributors (Docs): {uniqueContributorsDocs}</Text>
        <Text>Unique Contributors (Feature): {uniqueContributorsFeature}</Text>
        <Text>Unique Contributors (Fix): {uniqueContributorsFix}</Text>
        <Text>Total Contributors: {totalContributors}</Text>
      </div>
    </Modal>
  );
}
