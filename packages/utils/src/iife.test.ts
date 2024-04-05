import { iife } from './iife';

describe(iife.name, () => {
  test('Should immediately invoke the given function and return its result.', () => {
    const result = iife(() => {
      return 1 + 1;
    });

    expect(result).toEqual(2);
  });
});
