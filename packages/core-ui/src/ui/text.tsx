import React from 'react';
import { match } from 'ts-pattern';

import { cx } from '../utils/cx';

export type TextProps = Pick<
  React.HTMLProps<HTMLElement>,
  'className' | 'children'
> & {
  color?: 'black' | 'error' | 'gray-500' | 'success' | 'white';
  variant?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  weight?: '400' | '500' | '600';
};

export function Text({
  children,
  className,
  color = 'black',
  variant = 'md',
  weight = '400',
}: TextProps) {
  return (
    <p
      className={cx(
        match(color)
          .with('black', () => 'text-black')
          .with('error', () => 'text-red-600')
          .with('gray-500', () => 'text-gray-500')
          .with('success', () => 'text-green-600')
          .with('white', () => 'text-white')
          .exhaustive(),

        match(variant)
          .with('xs', () => 'text-xs')
          .with('sm', () => 'text-sm')
          .with('md', () => 'text-base')
          .with('lg', () => 'text-lg')
          .with('xl', () => 'text-xl')
          .with('2xl', () => 'text-2xl')
          .with('3xl', () => 'text-3xl')
          .with('4xl', () => 'text-4xl')
          .with('5xl', () => 'text-5xl')
          .exhaustive(),

        match(weight)
          .with('400', () => 'font-normal')
          .with('500', () => 'font-medium')
          .with('600', () => 'font-semibold')
          .exhaustive(),

        className
      )}
    >
      {children}
    </p>
  );
}
