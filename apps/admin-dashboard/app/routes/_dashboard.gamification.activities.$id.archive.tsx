import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';

import { Button, Form, Modal } from '@oyster/core-ui';

import { Route } from '../shared/constants';
import { archiveActivity } from '../shared/core.server';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '../shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  try {
    await archiveActivity(params.id as string);

    toast(session, {
      message: 'Archived activity.',
      type: 'success',
    });

    return redirect(Route.ACTIVITIES, {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({
      error: (e as Error).message,
    });
  }
}

export default function ArchiveActivityPage() {
  const { error } = useActionData<typeof action>() || {};

  const navigate = useNavigate();

  const submitting = useNavigation().state === 'submitting';

  function onClose() {
    navigate(Route.ACTIVITIES);
  }

  function onBack() {
    navigate(-1);
  }

  return (
    <Modal onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Archive Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        After you archive this activity, members will no longer receive points
        for completing it.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button
            color="error"
            loading={submitting}
            type="submit"
            variant="secondary"
          >
            Archive
          </Button>

          <Button
            loading={submitting}
            onClick={onBack}
            type="button"
            variant="secondary"
          >
            Back
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}
