import { Outlet } from '@remix-run/react';

import { Text } from '@colorstack/core-ui';
import { Public } from '@colorstack/feature-ui';

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
