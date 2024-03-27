import { describe, expect, test } from 'vitest';

import { toTitleCase } from './to-title-case';

const HELLO = 'Hello';
const HELLO_WORLD = 'Hello World';
const REPLY_TO_THREAD = 'Reply to Thread';
const THE_QUICK_BROWN_FOX = 'The Quick Brown Fox';

describe(toTitleCase.name, () => {
  test('If the input is an empty string...', () => {
    expect(toTitleCase('')).toBe('');
  });

  test('If the input is already in title case...', () => {
    expect(toTitleCase('Hello')).toBe(HELLO);
    expect(toTitleCase('Hello World')).toBe(HELLO_WORLD);
    expect(toTitleCase('Reply to Thread')).toBe(REPLY_TO_THREAD);
    expect(toTitleCase('The Quick Brown Fox')).toBe(THE_QUICK_BROWN_FOX);
  });

  test('If the input is in "camelCase"...', () => {
    expect(toTitleCase('helloWorld')).toBe(HELLO_WORLD);
    expect(toTitleCase('replyToThread')).toBe(REPLY_TO_THREAD);
    expect(toTitleCase('theQuickBrownFox')).toBe(THE_QUICK_BROWN_FOX);
  });

  test('If the input is in "snake_case"...', () => {
    expect(toTitleCase('hello_world')).toBe(HELLO_WORLD);
    expect(toTitleCase('reply_to_thread')).toBe(REPLY_TO_THREAD);
    expect(toTitleCase('the_quick_brown_fox')).toBe(THE_QUICK_BROWN_FOX);
  });

  test('If the input is in "SCREAMING_SNAKE_CASE"...', () => {
    expect(toTitleCase('HELLO')).toBe(HELLO);
    expect(toTitleCase('HELLO_WORLD')).toBe(HELLO_WORLD);
    expect(toTitleCase('REPLY_TO_THREAD')).toBe(REPLY_TO_THREAD);
    expect(toTitleCase('THE_QUICK_BROWN_FOX')).toBe(THE_QUICK_BROWN_FOX);
  });

  test('If the input is all "lowercase"...', () => {
    expect(toTitleCase('hello')).toBe(HELLO);
    expect(toTitleCase('hello world')).toBe(HELLO_WORLD);
    expect(toTitleCase('reply to thread')).toBe(REPLY_TO_THREAD);
    expect(toTitleCase('the quick brown fox')).toBe(THE_QUICK_BROWN_FOX);
  });
});
