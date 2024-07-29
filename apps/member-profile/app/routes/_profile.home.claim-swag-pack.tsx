import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { Modal } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    redirectTo: `${Route['/login']}?context=claim-swag-pack`,
  });

  return json({});
}

export default function ClaimSwagPackLayout() {
  return (
    <Modal onCloseTo={Route['/home']}>
      <Outlet />
    </Modal>
  );
}
