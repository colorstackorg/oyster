import { json } from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { isFeatureFlagEnabled } from '@oyster/core/member-profile/server';
import { Public, Text } from '@oyster/ui';

export async function loader() {
  const isApplicationOpen = await isFeatureFlagEnabled('family_application');

  return json({
    isApplicationOpen,
  });
}

export default function ApplicationLayout() {
  const { isApplicationOpen } = useLoaderData<typeof loader>();

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
