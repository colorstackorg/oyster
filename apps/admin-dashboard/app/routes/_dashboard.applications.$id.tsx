import { type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLocation } from '@remix-run/react';

import { Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    minimumRole: 'ambassador',
  });

  return null;
}

export default function ApplicationLayout() {
  const { search } = useLocation();

  return (
    <Modal onCloseTo={Route['/applications'] + search}>
      <Outlet />
    </Modal>
  );
}
