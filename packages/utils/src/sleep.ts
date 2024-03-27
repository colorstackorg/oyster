/**
 * Blocks the current thread for the specified number of milliseconds.
 *
 * @param ms - Number of milliseconds to sleep.
 *
 * @example
 * await sleep(1000); // Sleep for 1 second.
 * await sleep(5000); // Sleep for 5 seconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
