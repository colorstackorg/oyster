import React, { type PropsWithChildren } from 'react';
import { match } from 'ts-pattern';

import { Text } from './text';
import { cx } from '../utils/cx';

type CalloutProps = PropsWithChildren<{
  color: 'blue' | 'green' | 'red';
  icon?: React.ReactElement;
}>;

export function Callout({ children, color, icon }: CalloutProps) {
  const backgroundColor = match(color)
    .with('blue', () => 'bg-blue-500/10')
    .with('green', () => 'bg-green-500/10')
    .with('red', () => 'bg-red-500/10')
    .exhaustive();

  const textColor = match(color)
    .with('blue', () => 'text-blue-500')
    .with('green', () => 'text-green-500')
    .with('red', () => 'text-red-500')
    .exhaustive();

  if (icon) {
    icon = React.cloneElement(icon, {
      className: cx('h-4 w-4', textColor),
    });
  }

  return (
    <div
      className={cx('flex items-start gap-2 rounded-lg p-4', backgroundColor)}
    >
      {icon && <div className="mt-1">{icon}</div>}

      <Text className={textColor} variant="sm">
        {children}
      </Text>
    </div>
  );
}
