import { json, type LoaderFunctionArgs } from '@remix-run/node';

import {
  commitSession,
  ensureUserAuthenticated,
  toast,
} from '@/shared/session.server';

export async function action({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const form = await request.formData();

  toast(session, {
    message: form.get('message') as string,
    type: 'success',
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
