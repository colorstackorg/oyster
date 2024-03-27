import { describe, expect, test } from 'vitest';

import { sleep } from './sleep';

describe(sleep.name, () => {
  test('Should sleep for the specified number of milliseconds.', async () => {
    const start = Date.now();
    await sleep(1000);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(1000);
  });
});
