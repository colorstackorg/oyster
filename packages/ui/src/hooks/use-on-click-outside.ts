import type React from 'react';
import { useEffect } from 'react';

type OnClickOutsideRef<T> = React.MutableRefObject<T | null>;

/**
 * Hook that detects whether or not there was a click on an element outside
 * of the given refs, and runs a handler function upon detection. If the click
 * happens within the child of one of the ref elements, this handler function
 * will not run.
 *
 * @param refs - Array of refs of HTML element to detect clicks outside of.
 * @param onClickOutside - Handler function to trigger.
 */
export function useOnClickOutside<T extends HTMLElement>(
  input: OnClickOutsideRef<T> | OnClickOutsideRef<T>[],
  onClickOutside: (event: Event) => void | Promise<void>
): void {
  useEffect(() => {
    const refs: OnClickOutsideRef<T>[] = Array.isArray(input) ? input : [input];

    const listener = async (event: Event): Promise<void> => {
      // If we click one of the target elements, or a descendant of the target
      // elements, then we didn't click "outside", so do nothing.
      for (const ref of refs) {
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return;
        }
      }

      await onClickOutside(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [onClickOutside, input]);
}
