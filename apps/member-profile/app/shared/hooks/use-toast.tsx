import { useFetcher } from '@remix-run/react';

import { type ToastProps } from '@oyster/ui';

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
