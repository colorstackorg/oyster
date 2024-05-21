import { type ActionFunctionArgs, json } from '@remix-run/node';

import { createTag } from '@/member-profile.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function action({ request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const data = await request.formData();

  const { id, name } = Object.fromEntries(data);

  await createTag({
    id: id as string,
    name: name as string,
  });

  return json({});
}
