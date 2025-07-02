import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form,
  useActionData,
  useNavigate,
  useNavigation,
} from '@remix-run/react';

import { archiveActivity } from '@oyster/core/gamification';
import { Button, ErrorMessage, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return null;
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  try {
    await archiveActivity(params.id as string);

    toast(session, {
      message: 'Archived activity.',
    });

    return redirect(Route['/gamification/activities'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return data({ error: (e as Error).message }, { status: 500 });
  }
}

export default function ArchiveActivityPage() {
  const { error } = useActionData<typeof action>() || {};

  const navigate = useNavigate();

  const submitting = useNavigation().state === 'submitting';

  function onBack() {
    navigate(-1);
  }

  return (
    <Modal onCloseTo={Route['/gamification/activities']}>
      <Modal.Header>
        <Modal.Title>Archive Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        After you archive this activity, members will no longer receive points
        for completing it.
      </Modal.Description>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group flexDirection="row-reverse">
          <Button.Submit color="error" variant="secondary">
            Archive
          </Button.Submit>

          <Button
            onClick={onBack}
            submitting={submitting}
            type="button"
            variant="secondary"
          >
            Back
          </Button>
        </Button.Group>
      </Form>
    </Modal>
  );
}
