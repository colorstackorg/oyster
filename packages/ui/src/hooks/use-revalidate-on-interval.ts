import { useRevalidator } from '@remix-run/react';
import { useEffect } from 'react';

/**
 * Revalidates the current Remix route on a specified interval. This is useful
 * for keeping data fresh by periodically revalidating in the background,
 * similar to the SWR `refreshInterval` option.
 */
export function useRevalidateOnInterval(interval: number) {
  const revalidator = useRevalidator();

  useEffect(() => {
    const id = setInterval(() => {
      revalidator.revalidate();
    }, interval);

    return () => {
      clearInterval(id);
    };
  }, [interval, revalidator]);
}
