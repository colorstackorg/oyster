import { type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { generatePath } from '@remix-run/react';

import { Route } from '@/shared/constants';

export async function loader({ params }: LoaderFunctionArgs) {
  return redirect(
    generatePath(Route['/companies/:id/reviews'], {
      id: params.id as string,
    })
  );
}
