import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { Form as RemixForm, useLoaderData } from '@remix-run/react';

import { removeAdmin } from '@oyster/core/admins';
import { db } from '@oyster/db';
import { Button, Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const admin = await db
    .selectFrom('admins')
    .select(['firstName', 'lastName'])
    .where('id', '=', params.id as string)
    .executeTakeFirst();

  if (!admin) {
    return redirect(Route['/admins']);
  }

  return json({
    admin,
  });
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const admin = await removeAdmin({ id: params.id as string });

  if (!admin) {
    throw new Response(null, { status: 404 });
  }

  toast(session, {
    message: 'Removed member.',
  });

  return redirect(Route['/admins'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function RemoveAdminPage() {
  const { admin } = useLoaderData<typeof loader>();

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

      <RemixForm className="form" method="post">
        <Button.Group>
          <Button color="error" type="submit">
            Remove
          </Button>
        </Button.Group>
      </RemixForm>
    </Modal>
  );
}

export function ErrorBoundary() {
  return <></>;
}
