import { json, LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLocation, useNavigate } from '@remix-run/react';

import { Modal } from '@oyster/core-ui';

import { Route } from '../shared/constants';
import { ensureUserAuthenticated } from '../shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request, {
    allowAmbassador: true,
  });

  return json({});
}

export default function ApplicationLayout() {
  const navigate = useNavigate();

  const { search } = useLocation();

  function onClose() {
    navigate({
      pathname: Route.APPLICATIONS,
      search,
    });
  }

  return (
    <Modal onClose={onClose}>
      <Outlet />
    </Modal>
  );
}
