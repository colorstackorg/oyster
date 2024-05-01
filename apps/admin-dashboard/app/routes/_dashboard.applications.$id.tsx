import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useLocation, useNavigate } from '@remix-run/react';

import { Modal } from '@oyster/ui';

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
      pathname: Route['/applications'],
      search,
    });
  }

  return (
    <Modal onClose={onClose}>
      <Outlet />
    </Modal>
  );
}
