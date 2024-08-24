import { type LoaderFunctionArgs, redirect } from '@remix-run/node';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'owner',
  });

  return redirect('/bull/airtable/jobs');
}
