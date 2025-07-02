import { Outlet } from 'react-router';

import { Public } from '@oyster/ui';

export default function PublicLayout() {
  return (
    <Public.Layout>
      <Outlet />
    </Public.Layout>
  );
}
