import { Outlet } from '@remix-run/react';

import { Public, Text } from '@oyster/ui';

export default function ApplicationLayout() {
  return (
    <Public.Content layout="lg">
      <img
        alt="ColorStack Workmark"
        height={30}
        width={200}
        src="/images/colorstack-wordmark.png"
      />

      <Text className="mt-8" variant="2xl">
        The ColorStack Family Application
      </Text>

      <Outlet />
    </Public.Content>
  );
}
