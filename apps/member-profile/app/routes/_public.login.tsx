import { json } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { Login, Public } from '@oyster/ui';

export async function loader() {
  return json({});
}

export default function LoginLayout() {
  return (
    <Public.Content>
      <Login.Title>ColorStack Profile</Login.Title>
      <Outlet />
    </Public.Content>
  );
}
