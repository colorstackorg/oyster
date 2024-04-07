import { useRevalidator } from '@remix-run/react';
import { useEffect } from 'react';

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
