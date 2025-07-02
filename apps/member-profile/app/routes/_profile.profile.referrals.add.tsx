import {
  type ActionFunctionArgs,
  data,
  type LoaderFunctionArgs,
  redirect,
  useActionData,
} from 'react-router';

import { referFriend, ReferFriendInput } from '@oyster/core/referrals';
import { ReferFriendForm } from '@oyster/core/referrals/ui';
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
    ReferFriendInput.omit({ referrerId: true })
  );

  if (!result.ok) {
    return data(result, { status: 400 });
  }

  const referResult = await referFriend({
    ...result.data,
    referrerId: user(session),
  });

  if (!referResult.ok) {
    return data({ error: referResult.error }, { status: 500 });
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
