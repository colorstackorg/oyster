import { useRevalidator } from '@remix-run/react';
import { useEffect } from 'react';

/**
 * Revalidates the current Remix route when the window is focused or visibility
 * changes. This is useful for revalidating data when the user returns to the
 * tab, acting similar to the SWR `revalidateOnFocus` option.
 */
export function useRevalidateOnFocus() {
  const revalidator = useRevalidator();

  useEffect(() => {
    function onFocus() {
      revalidator.revalidate();
    }

    window.addEventListener('focus', onFocus);
    window.addEventListener('visibilitychange', onFocus);

    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('visibilitychange', onFocus);
    };
  }, [revalidator]);
}
