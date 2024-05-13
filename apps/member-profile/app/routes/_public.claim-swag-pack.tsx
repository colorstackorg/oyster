import { redirect } from '@remix-run/node';

import { Route } from '@/shared/constants';

export function loader() {
  return redirect(Route['/home/claim-swag-pack']);
}
