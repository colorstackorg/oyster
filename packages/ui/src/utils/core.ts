/**
 * Set value on input element.
 *
 * This should only be used when you need to set value on an input element
 * outside of React. It's hacky and should be avoided if possible.
 *
 * Motivation: When we just try to set the value directly on the input element,
 * React doesn't trigger a change event (their event system is different from
 * the native one). This function tries to work around that by manually
 * creating a change event and dispatching it on the input element.
 *
 * @param input - Input element to set value on.
 * @param value - Value to set on input element.
 *
 * @see https://github.com/facebook/react/issues/27283
 * @see https://github.com/facebook/react/issues/10135
 */
export function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  );

  const set = descriptor?.set;

  if (!set) {
    return;
  }

  set.call(input, value);

  const event = new Event('change', { bubbles: true });

  input.dispatchEvent(event);
}
