import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData } from '@remix-run/react';

import { addActivity } from '@oyster/core/gamification';
import { CreateActivityInput } from '@oyster/core/gamification/types';
import { ActivityForm } from '@oyster/core/gamification/ui';
import { getErrors, Modal, validateForm } from '@oyster/ui';

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

export async function action({ request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const result = await validateForm(request, CreateActivityInput);

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  await addActivity(result.data);

  toast(session, {
    message: 'Added a new activity.',
  });

  return redirect(Route['/gamification/activities'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function AddActivity() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/gamification/activities']}>
      <Modal.Header>
        <Modal.Title>Add Activity</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ActivityForm error={error} errors={errors} />
    </Modal>
  );
}
