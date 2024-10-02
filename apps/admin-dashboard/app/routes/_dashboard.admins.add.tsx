import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData } from '@remix-run/react';

import { addAdmin } from '@oyster/core/admins';
import { AddAdminInput } from '@oyster/core/admins/types';
import { AdminForm } from '@oyster/core/admins/ui';
import { getErrors, Modal, validateForm } from '@oyster/ui';

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

  const { data, errors, ok } = await validateForm(
    request,
    AddAdminInput.omit({ actor: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const result = await addAdmin({
    actor: user(session),
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role,
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: result.code });
  }

  toast(session, {
    message: 'Added admin.',
  });

  return redirect(Route['/admins'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddAdmin() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/admins']}>
      <Modal.Header>
        <Modal.Title>Add Admin</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <AdminForm error={error} errors={errors} />
    </Modal>
  );
}
