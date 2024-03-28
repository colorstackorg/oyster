import { useEffect, useState } from 'react';

let hydrating: boolean = true;

/**
 * Returns true if the JS has been hyrdated.
 *
 * In SSR, the result will always be false. In CSR, the result will be false
 * on the render and true from then on. Even if a new component renders, it will
 * always start with true.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState<boolean>(() => !hydrating);

  useEffect(() => {
    hydrating = false;
    setHydrated(true);
  }, []);

  return hydrated;
}
