import { describe, expect, test } from 'vitest';

import { sleep } from './sleep';

describe(sleep.name, () => {
  test('Should sleep for the specified number of milliseconds.', async () => {
    const start = Date.now();
    await sleep(100);
    const end = Date.now();

    const elapsed = end - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThanOrEqual(110);
  });
});
