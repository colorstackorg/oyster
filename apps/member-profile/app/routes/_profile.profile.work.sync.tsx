import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';

import { syncLinkedInProfiles } from '@oyster/core/linkedin';
import { Button, ErrorMessage, getErrors, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  await syncLinkedInProfiles({
    memberIds: [user(session)],
  });

  toast(session, {
    message: 'Synced LinkedIn profile.',
  });

  return redirect(Route['/profile/work'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function SyncLinkedInModal() {
  const { error } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/work']}>
      <Modal.Header>
        <Modal.Title>Sync LinkedIn Profile</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        This will sync your work history, education history, and current
        location with your LinkedIn profile. This should take less than 30
        seconds.
      </Modal.Description>

      <Form className="form" method="post">
        <ErrorMessage>{error}</ErrorMessage>

        <Button.Group>
          <Button.Submit>Sync</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}
