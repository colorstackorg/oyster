import {
  type ActionFunctionArgs,
  json,
  type LoaderFunctionArgs,
  redirect,
} from '@remix-run/node';
import { useActionData } from '@remix-run/react';

import { referFriend, ReferFriendInput } from '@oyster/core/referrals';
import { ReferFriendForm } from '@oyster/core/referrals.ui';
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
    ReferFriendInput.omit({ referrerId: true })
  );

  if (!ok) {
    return json({ errors }, { status: 400 });
  }

  const result = await referFriend({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    referrerId: user(session),
  });

  if (!result.ok) {
    return json({ error: result.error }, { status: 400 });
  }

  toast(session, {
    message: 'Referral sent!',
  });

  return redirect(Route['/profile/referrals'], {
    headers: {
      'Set-Cookie': await commitSession(session),
    },
  });
}

export default function ReferFriend() {
  const { error, errors } = getErrors(useActionData<typeof action>());

  return (
    <Modal onCloseTo={Route['/profile/referrals']}>
      <Modal.Header>
        <Modal.Title>Refer a Friend</Modal.Title>
        <Modal.CloseButton />
      </Modal.Header>

      <ReferFriendForm error={error} errors={errors} />
    </Modal>
  );
}
