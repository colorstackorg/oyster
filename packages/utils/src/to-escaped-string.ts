/**
 * Returns the string with all special characters escaped.
 *
 * This is useful for escaping strings that will be used in a `RegExp`.
 *
 * @example
 * ```ts
 * toEscapedString('foo.bar') // => 'foo\\.bar'
 * toEscapedString('foo[bar]') // => 'foo\\[bar\\]'
 * toEscapedString('foo(bar)') // => 'foo\\(bar\\)'
 * toEscapedString('foo{bar}') // => 'foo\\{bar\\}'
 * toEscapedString('foo?bar') // => 'foo\\?bar'
 * toEscapedString('foo+bar') // => 'foo\\+bar'
 * toEscapedString('foo*bar') // => 'foo\\*bar'
 * toEscapedString('foo^bar') // => 'foo\\^bar'
 * toEscapedString('foo$bar') // => 'foo\\$bar'
 * toEscapedString('foo|bar') // => 'foo\\|bar'
 * ```
 */
export function toEscapedString(input: string): string {
  return input.replace(/([.*+?^${}()|[\]\\])/g, '\\$1');
}
