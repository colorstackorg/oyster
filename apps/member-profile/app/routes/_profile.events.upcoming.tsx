import { redirect } from 'react-router';

import { Route } from '@/shared/constants';

export async function loader() {
  return redirect(Route['/events']);
}
