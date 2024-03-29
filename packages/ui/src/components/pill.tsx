import { Link } from '@remix-run/react';
import React, { PropsWithChildren } from 'react';
import { X } from 'react-feather';
import { match } from 'ts-pattern';

import { cx } from '../utils/cx';
import { Text } from './text';

export type PillProps = Pick<React.HTMLProps<HTMLElement>, 'children'> & {
  color:
    | 'amber-100'
    | 'blue-100'
    | 'cyan-100'
    | 'gold-100'
    | 'gray-100'
    | 'green-100'
    | 'lime-100'
    | 'orange-100'
    | 'pink-100'
    | 'purple-100'
    | 'red-100';

  onCloseHref?: string;
};

export const Pill = ({ children, color, onCloseHref }: PillProps) => {
  return (
    <Text className={getPillCn({ color, onCloseHref })} variant="sm">
      {children}{' '}
      {onCloseHref && (
        <Link className="rounded-full hover:bg-gray-100" to={onCloseHref}>
          <X size={16} />
        </Link>
      )}
    </Text>
  );
};

export function getPillCn({ color, onCloseHref }: Omit<PillProps, 'children'>) {
  return cx(
    'w-max rounded-full bg-[var(--background-color)] px-2 text-sm',

    onCloseHref && 'flex items-center gap-1',

    match(color)
      .with('amber-100', () => 'bg-amber-100')
      .with('blue-100', () => 'bg-blue-100')
      .with('cyan-100', () => 'bg-cyan-100')
      .with('gold-100', () => 'bg-[var(--color-gold-100)]')
      .with('gray-100', () => 'bg-gray-100')
      .with('green-100', () => 'bg-green-100')
      .with('lime-100', () => 'bg-lime-100')
      .with('orange-100', () => 'bg-orange-100')
      .with('pink-100', () => 'bg-pink-100')
      .with('purple-100', () => 'bg-purple-100')
      .with('red-100', () => 'bg-red-100')
      .exhaustive()
  );
}

Pill.List = function PillList({ children }: PropsWithChildren) {
  return <ul className="flex flex-wrap gap-2">{children}</ul>;
};
