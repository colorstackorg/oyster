import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import {
  Form as RemixForm,
  useActionData,
  useLoaderData,
} from '@remix-run/react';

import { acceptApplication, getApplication } from '@oyster/core/applications';
import { Button, Form, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  const application = await getApplication(params.id as string, [
    'applications.firstName',
    'applications.lastName',
  ]);

  if (!application) {
    throw new Response(null, { status: 404 });
  }

  return json({
    application,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  try {
    await acceptApplication(params.id as string, user(session));

    toast(session, {
      message: 'Application has been accepted.',
    });

    return redirect(Route['/applications'], {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, { status: 500 });
  }
}

export default function AcceptApplicationPage() {
  const { application } = useLoaderData<typeof loader>();
  const { error } = useActionData<typeof action>() || {};

  return (
    <>
      <Modal.Header>
        <Modal.Title>Accept Application</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        Just confirming - do you want to accept the application of{' '}
        {application.firstName} {application.lastName}? This application was
        previously rejected.
      </Modal.Description>

      <RemixForm className="form" method="post">
        <Form.ErrorMessage>{error}</Form.ErrorMessage>

        <Button.Group>
          <Button type="submit">Accept</Button>
        </Button.Group>
      </RemixForm>
    </>
  );
}
