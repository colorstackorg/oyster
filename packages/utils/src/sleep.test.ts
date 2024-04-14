import { sleep } from './sleep';

describe(sleep.name, () => {
  test('Should sleep for the specified number of milliseconds.', async () => {
    const start = Date.now();

    await sleep(100);

    const elapsed = Date.now() - start;

    expect(elapsed).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThanOrEqual(110);
  });
});
