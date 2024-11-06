import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { generatePath } from '@remix-run/react';

import { Route } from '@/shared/constants';

export async function loader(_: LoaderFunctionArgs) {
  return redirect(generatePath(Route['/compensation/full-time-offers'], {}));
}
