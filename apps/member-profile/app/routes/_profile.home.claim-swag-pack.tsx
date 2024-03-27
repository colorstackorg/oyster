import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useNavigate } from '@remix-run/react';

import { Modal } from '@colorstack/core-ui';

import { Route } from '../shared/constants';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    redirectTo: `${Route.LOGIN}?context=claim-swag-pack`,
  });

  return json({});
}

export default function ClaimSwagPackLayout() {
  const navigate = useNavigate();

  function onClose() {
    navigate(Route.HOME);
  }

  return (
    <Modal onClose={onClose}>
      <Outlet />
    </Modal>
  );
}
