import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useLoaderData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';

import { Button, Modal } from '@oyster/ui';

import { Route } from '../shared/constants';
import { deleteFeatureFlag, getFeatureFlag } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const flag = await getFeatureFlag(parseInt(params.id as string));

  if (!flag) {
    throw new Response(null, { status: 404 });
  }

  return json({
    flag,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await deleteFeatureFlag(parseInt(params.id as string));

  toast(session, {
    message: 'Deleted feature flag.',
    type: 'success',
  });

  return redirect(Route['/feature-flags'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function DeleteFeatureFlagModal() {
  const { flag } = useLoaderData<typeof loader>();

  const navigate = useNavigate();
  const submitting = useNavigation().state === 'submitting';

  function onClose() {
    navigate(Route['/feature-flags']);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Delete Flag ({flag.displayName})</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Are you sure you want to delete this feature flag? This action cannot be
        undone.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Button.Group>
          <Button color="error" loading={submitting} type="submit">
            Delete
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
