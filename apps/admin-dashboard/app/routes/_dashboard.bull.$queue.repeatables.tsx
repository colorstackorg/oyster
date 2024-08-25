import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { validateQueue } from '@/shared/bull';
import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function loader() {
  return json({});
}

export async function action({ params, request }: ActionFunctionArgs) {
  const session = await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  const form = await request.formData();
  const { id } = Object.fromEntries(form);

  const queue = await validateQueue(params.queue as string);

  await queue.removeRepeatableByKey(id as string);

  toast(session, {
    message: 'Removed repeatable.',
  });

  return json(
    {},
    {
      headers: {
        'Set-Cookie': await commitSession(session),
      },
    }
  );
}

export default function RepeatablesPage() {
  return <Outlet />;
}
