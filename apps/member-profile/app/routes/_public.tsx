import { Outlet } from '@remix-run/react';

import { Public } from '@colorstack/feature-ui';

export default function PublicLayout() {
  return (
    <Public.Layout>
      <Outlet />
    </Public.Layout>
  );
}
