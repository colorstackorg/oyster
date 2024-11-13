import { type LoaderFunctionArgs, redirect } from '@remix-run/node';

import { Route } from '@/shared/constants';

export async function loader(_: LoaderFunctionArgs) {
  return redirect(Route['/compensation/full-time']);
}
