import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { generatePath } from '@remix-run/react';

import { Route } from '@/shared/constants';

export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(
    generatePath(Route['/recap/:date/leaderboard'], {
      date: params.date as string,
    })
  );
}
