import React from 'react';
import { match } from 'ts-pattern';

import { cx } from '../utils/cx';

export type TextProps = Pick<
  React.HTMLProps<HTMLElement>,
  'className' | 'children'
> & {
  align?: 'left' | 'center' | 'right';
  as?: 'p' | 'span';
  color?: 'black' | 'error' | 'gray-500' | 'primary' | 'success' | 'white';
  variant?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  weight?: '400' | '500' | '600';
};

export function Text({
  align,
  as: Component = 'p',
  children,
  className,
  color,
  variant,
  weight,
}: TextProps) {
  return (
    <Component
      className={getTextCn({
        align,
        className,
        color,
        variant,
        weight,
      })}
    >
      {children}
    </Component>
  );
}

export function getTextCn({
  align = 'left',
  className,
  color = 'black',
  variant = 'md',
  weight = '400',
}: Pick<TextProps, 'align' | 'className' | 'color' | 'variant' | 'weight'>) {
  return cx(
    match(align)
      .with('left', () => 'text-left')
      .with('center', () => 'text-center')
      .with('right', () => 'text-right')
      .exhaustive(),

    match(color)
      .with('black', () => 'text-black')
      .with('error', () => 'text-red-600')
      .with('gray-500', () => 'text-gray-500')
      .with('primary', () => 'text-primary')
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
  );
}
