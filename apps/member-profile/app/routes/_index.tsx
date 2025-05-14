import { redirect } from '@remix-run/node';

import { Route } from '@/shared/constants';

export async function loader() {
  return redirect(Route['/home']);
}
