import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';

import { getAdmin, removeAdmin } from '@oyster/core/admins';
import { Button, ErrorMessage, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
  user,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const admin = await getAdmin({
    select: ['admins.firstName', 'admins.lastName'],
    where: { id: params.id as string },
  });

  if (!admin) {
    throw new Response(null, { status: 404 });
  }

  return json({
    admin,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await removeAdmin({
    actor: user(session),
    id: params.id as string,
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Removed admin.',
  });

  return redirect(Route['/admins'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function RemoveAdminPage() {
  const { admin } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <Modal onCloseTo={Route['/admins']}>
      <Modal.Header>
        <Modal.Title>
          Remove {admin.firstName} {admin.lastName}
        </Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <Modal.Description>
        This is not an undoable action. Are you sure want to remove this admin?
      </Modal.Description>

      <Form className="form" method="post">
        <ErrorMessage>{actionData?.error}</ErrorMessage>

        <Button.Group>
          <Button.Submit color="error">Remove</Button.Submit>
        </Button.Group>
      </Form>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
