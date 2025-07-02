import { useEffect } from 'react';
import { useRevalidator } from 'react-router';

/**
 * Revalidates the current route on a specified interval. This is useful
 * for keeping data fresh by periodically revalidating in the background,
 * similar to the SWR `refreshInterval` option.
 */
export function useRevalidateOnInterval(ms: number) {
  const revalidator = useRevalidator();

  useEffect(() => {
    const interval = setInterval(() => {
      revalidator.revalidate();
    }, ms);

    return () => {
      clearInterval(interval);
    };
  }, [ms, revalidator]);
}
