import { type LoaderFunctionArgs, redirect } from 'react-router';

import { Route } from '@/shared/constants';

export async function loader(_: LoaderFunctionArgs) {
  return redirect(Route['/offers/internships']);
}
