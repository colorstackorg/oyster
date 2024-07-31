import { useFetcher, useMatches } from '@remix-run/react';
import { z } from 'zod';

import { type ToastProps } from '@oyster/ui';

import { AdminRole } from '@/modules/admin/admin.types';

/**
 * Returns the role of the logged-in admin.
 *
 * This hook relies on the _dashboard layout to return the `role` property from
 * the loader, and we read it from that loader's data.
 *
 * If the data is not available or formatted correctly, we return `undefined`.
 */
export function useAdminRole() {
  const matches = useMatches();

  const match = matches.find((match) => {
    return match.id === 'routes/_dashboard';
  });

  if (!match) {
    return undefined;
  }

  const result = z
    .object({ role: z.nativeEnum(AdminRole) })
    .safeParse(match.data);

  if (!result.success) {
    return undefined;
  }

  return result.data.role;
}

/**
 * This hook is a utility that allows us to show a toast message from anywhere
 * in the UI.
 */
export function useToast() {
  const fetcher = useFetcher();

  function toast({ message }: Pick<ToastProps, 'message'>) {
    fetcher.submit(
      { message },
      {
        action: '/api/toast',
        method: 'post',
      }
    );
  }

  return toast;
}
