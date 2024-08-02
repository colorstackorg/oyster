import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';

import { db } from '@oyster/db';
import { Button, getButtonCn, Modal, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);
  const student = await db
    .selectFrom('students')
    .select(['activatedAt', 'claimedSwagPackAt', 'createdAt'])
    .where('id', '=', user(session))
    .executeTakeFirst();

  if (!student) {
    throw new Response(null, { status: 404 });
  }

  const hasClaimed = student.claimedSwagPackAt;
  const isActivated = student.activatedAt;
  const joinedBeforeActivation = student.createdAt < new Date('2023-06-09'); // date when activation flow updated for new members

  return json({ hasClaimed, isActivated, joinedBeforeActivation });
}

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);
}

export default function SwagPackEligibilityModal() {
  return (
    <Modal onCloseTo={Route['/home']}>
      <Modal.Header>
        <Modal.Title>Swag Pack Eligibility</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <SwagPackEligibility />
    </Modal>
  );
}

function SwagPackEligibility() {
  const { hasClaimed, isActivated, joinedBeforeActivation } =
    useLoaderData<typeof loader>();

  return (
    <div>
      {hasClaimed && (
        <Text>
          You have already claimed your swag pack! Check out the Merch Shop for
          more swag!
        </Text>
      )}
      {!hasClaimed && isActivated && (
        <>
          <Text className="mb-4">
            You are eligible to claim your swag pack!
          </Text>
          <Button.Group flexDirection="row-reverse" spacing="center">
            <Link
              className={getButtonCn({ variant: 'primary' })}
              to={Route['/home/claim-swag-pack']}
            >
              Claim Swag Pack
            </Link>
          </Button.Group>
        </>
      )}
      {!hasClaimed && joinedBeforeActivation && (
        <Text>[ Member joined before the activation date message ]</Text>
      )}
    </div>
  );
}
