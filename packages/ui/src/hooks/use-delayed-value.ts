import { useEffect, useState } from 'react';

/**
 * Returns the value but after the given delay.
 *
 * If the value changes before the delay has passed, then the new value will
 * be overwritten with the new value.
 *
 * @param value - Value to return after the given delay.
 * @param delay - Time in milliseconds to wait before setting the delayed value.
 */
export function useDelayedValue<T>(value: T, delay: number): T {
  const [valueAfterDelay, setValueAfterDelay] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      // Set the state value with the given value after the delay has passed!
      setValueAfterDelay(value);
    }, delay);

    return () => {
      // If the value before the delay has passed, we clear the timeout since
      // we have a newer timeout (from the newer value) that we are dealing
      // with and we no longer need to wait for this timeout. This will help
      // prevent any side-effects as well.
      clearTimeout(timeout);
    };
  }, [delay, value]);

  return valueAfterDelay;
}
