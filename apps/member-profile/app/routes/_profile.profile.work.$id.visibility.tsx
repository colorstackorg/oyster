import { type ActionFunctionArgs, json } from '@remix-run/node';

import { db } from '@oyster/db';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function action({ params, request }: ActionFunctionArgs) {
  await ensureUserAuthenticated(request);

  const formData = await request.formData();

  const visible = formData.get('visible') === '1';

  await db
    .updateTable('workExperiences')
    .set({ visible })
    .where('id', '=', params.id as string)
    .execute();

  return json({});
}
