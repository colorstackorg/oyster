import { type LoaderFunctionArgs, redirect } from 'react-router';

import { Route } from '@/shared/constants';
import { getSession } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await getSession(request);

  return redirect(Route['/applications']);
}
