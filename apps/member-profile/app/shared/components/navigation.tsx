import { NavLink } from '@remix-run/react';
import { type PropsWithChildren } from 'react';

import { cx } from '@oyster/ui';

type NavigationItemProps = PropsWithChildren<{
  to: string;
}>;

export function NavigationItem({ children, to }: NavigationItemProps) {
  return (
    <li>
      <NavLink
        className={({ isActive }) => {
          return cx(
            'underline hover:text-primary',
            isActive && 'text-primary underline'
          );
        }}
        to={to}
      >
        {children}
      </NavLink>
    </li>
  );
}
