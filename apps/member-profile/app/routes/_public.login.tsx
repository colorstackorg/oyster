import { Outlet } from 'react-router';

import { Login, Public } from '@oyster/ui';

export async function loader() {
  return null;
}

export default function LoginLayout() {
  return (
    <Public.Content>
      <Login.Title>ColorStack Profile</Login.Title>
      <Outlet />
    </Public.Content>
  );
}
