import React from 'react';

type LinkProps = Pick<
  React.HTMLProps<HTMLAnchorElement>,
  'children' | 'href' | 'target'
>;

export function Link({ children, ...rest }: LinkProps) {
  return (
    <a className="text-primary underline" {...rest}>
      {children}
    </a>
  );
}
