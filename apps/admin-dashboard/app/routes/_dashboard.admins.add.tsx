import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';

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

  return null;
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(
    request,
    AddAdminInput.omit({ actor: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const addResult = await addAdmin({
    ...result.data,
    actor: user(session),
  });

  if (!addResult.ok) {
    return data({ error: addResult.error }, { status: addResult.code });
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
