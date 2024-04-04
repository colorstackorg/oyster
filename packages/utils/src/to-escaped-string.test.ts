import { toEscapedString } from './to-escaped-string';

describe(toEscapedString.name, () => {
  test('Should escape special characters.', () => {
    expect(toEscapedString('foo.bar')).toBe('foo\\.bar');
    expect(toEscapedString('foo[bar]')).toBe('foo\\[bar\\]');
    expect(toEscapedString('foo(bar)')).toBe('foo\\(bar\\)');
    expect(toEscapedString('foo{bar}')).toBe('foo\\{bar\\}');
    expect(toEscapedString('foo?bar')).toBe('foo\\?bar');
    expect(toEscapedString('foo+bar')).toBe('foo\\+bar');
    expect(toEscapedString('foo*bar')).toBe('foo\\*bar');
    expect(toEscapedString('foo^bar')).toBe('foo\\^bar');
    expect(toEscapedString('foo$bar')).toBe('foo\\$bar');
    expect(toEscapedString('foo|bar')).toBe('foo\\|bar');
  });
});
