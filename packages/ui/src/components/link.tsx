import React from 'react';

type LinkProps = Pick<
  React.HTMLProps<HTMLAnchorElement>,
  'children' | 'href' | 'target'
>;

/**
 * @deprecated b/c we should use the `Link` component from `react-router`
 * instead.
 */
export function Link({ children, ...rest }: LinkProps) {
  return (
    <a className="text-primary underline" {...rest}>
      {children}
    </a>
  );
}
