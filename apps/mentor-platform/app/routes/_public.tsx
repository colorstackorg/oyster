import { Outlet } from '@remix-run/react';

import { Public } from '@oyster/ui';

export default function PublicLayout() {
  return (
    <Public.Layout>
      <Outlet />
    </Public.Layout>
  );
}
