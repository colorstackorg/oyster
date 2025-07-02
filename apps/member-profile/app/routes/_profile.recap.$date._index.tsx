import { generatePath, type LoaderFunctionArgs, redirect } from 'react-router';

import { Route } from '@/shared/constants';

export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(
    generatePath(Route['/recap/:date/leaderboard'], {
      date: params.date as string,
    })
  );
}
