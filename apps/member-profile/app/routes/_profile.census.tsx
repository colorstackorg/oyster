import { json, type LoaderFunctionArgs, redirect } from '@remix-run/node';
import { Outlet } from '@remix-run/react';

import { Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { isFeatureFlagEnabled } from '@/shared/core.server';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const isCensusEnabled = await isFeatureFlagEnabled('census_2024');

  if (!isCensusEnabled) {
    return redirect(Route['/home']);
  }

  return json({});
}

export default function CensusLayout() {
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8">
      <Text variant="2xl">ColorStack Census '24</Text>
      <Text className="-mt-4" color="gray-500">
        Thank you for taking the time to complete the ColorStack Annual Census!
        This feedback is extremely valuable to us as we continue to grow and
        improve our community.
      </Text>

      <Outlet />
    </div>
  );
}
