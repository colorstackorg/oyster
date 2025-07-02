import { Suspense } from 'react';
import { Await, type LoaderFunctionArgs, useLoaderData } from 'react-router';

import { getOysterContributorStats } from '@oyster/core/github';
import { Modal, Spinner, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const statsPromise = getOysterContributorStats();

  return {
    statsPromise,
  };
}

export default function OysterContributorsModal() {
  const { statsPromise } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/']}>
      <Modal.Header>
        <Modal.Title>Oyster (GitHub) Contributions</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Suspense fallback={<LoadingState />}>
        <Await resolve={statsPromise}>
          {({
            totalContributors: total,
            uniqueContributorsChore: chore,
            uniqueContributorsDocs: docs,
            uniqueContributorsFeature: feature,
            uniqueContributorsFix: fix,
          }) => {
            return (
              <div className="flex flex-col gap-2">
                <Text>Unique Contributors (Chore): {chore}</Text>
                <Text>Unique Contributors (Docs): {docs}</Text>
                <Text>Unique Contributors (Feature): {feature}</Text>
                <Text>Unique Contributors (Fix): {fix}</Text>
                <Text>Total Contributors: {total}</Text>
              </div>
            );
          }}
        </Await>
      </Suspense>
    </Modal>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-2">
      <Spinner />

      <Text color="gray-500" variant="sm">
        Querying the GitHub API...
      </Text>
    </div>
  );
}
