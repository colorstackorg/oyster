import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';

import {
  deleteFeatureFlag,
  getFeatureFlag,
} from '@oyster/core/admin-dashboard/server';
import { Button, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const flag = await getFeatureFlag({
    select: ['displayName'],
    where: { id: params.id as string },
  });

  if (!flag) {
    throw new Response(null, { status: 404 });
  }

  return json({
    flag,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  await deleteFeatureFlag(params.id as string);

  toast(session, {
    message: 'Deleted feature flag.',
  });

  return redirect(Route['/feature-flags'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function DeleteFeatureFlagModal() {
  const { flag } = useLoaderData<typeof loader>();

  return (
    <Modal onCloseTo={Route['/feature-flags']}>
      <Modal.Header>
        <Modal.Title>Delete Flag ({flag.displayName})</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this feature flag? This action cannot be
        undone.
      </Modal.Description>

      <Form className="form" method="post">
        <Button.Group>
          <Button.Submit color="error">Delete</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
