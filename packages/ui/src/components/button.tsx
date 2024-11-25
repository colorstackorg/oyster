import { useNavigation } from '@remix-run/react';
import React, { type PropsWithChildren } from 'react';
import { match } from 'ts-pattern';

import { Spinner } from './spinner';
import { cx } from '../utils/cx';

type ButtonProps = Pick<
  React.HTMLProps<HTMLButtonElement>,
  'children' | 'disabled' | 'name' | 'onClick' | 'type' | 'value'
> & {
  color?: 'error' | 'primary' | 'success';
  fill?: boolean;
  size?: 'regular' | 'small' | 'xs';
  submitting?: boolean;
  variant?: 'primary' | 'secondary';
};

export const Button = ({
  children,
  color,
  disabled,
  fill,
  size,
  submitting,
  type = 'button',
  variant,
  ...rest
}: ButtonProps) => {
  return (
    <button
      className={getButtonCn({ color, fill, size, variant })}
      disabled={!!disabled || !!submitting}
      // @ts-expect-error b/c TS does not like it...
      type={type}
      {...rest}
    >
      {children}
      {submitting && <Spinner color={color} />}
    </button>
  );
};

Button.Submit = function SubmitButton(
  props: Omit<ButtonProps, 'loading' | 'type'>
) {
  const { formMethod, state } = useNavigation();

  return (
    <Button
      // There's a weird Remix thing (not sure if it's only in development)
      // where the initial state on the server is "submitting" but everything
      // else is undefined...so we just check the "formMethod" to ensure it's
      // real.
      submitting={state === 'submitting' && !!formMethod}
      type="submit"
      {...props}
    />
  );
};

export function getButtonCn({
  color = 'primary',
  fill = false,
  size = 'regular',
  variant = 'primary',
}: Pick<ButtonProps, 'color' | 'fill' | 'size' | 'variant'>) {
  return cx(
    'flex items-center justify-center gap-2 rounded-full border border-solid',
    'hover:opacity-80',
    'transition-opacity',
    'disabled:opacity-50',

    match(color)
      .with('error', () => 'border-red-600')
      .with('primary', () => 'border-primary')
      .with('success', () => 'border-green-600')
      .exhaustive(),

    match(fill)
      .with(true, () => 'w-full')
      .with(false, () => 'w-max')
      .exhaustive(),

    match(size)
      .with('regular', () => 'px-4 py-3')
      .with('small', () => 'px-3 py-2')
      .with('xs', () => 'px-2 py-1 text-sm')
      .exhaustive(),

    match(variant)
      .with('primary', () =>
        match(color)
          .with('error', () => 'bg-red-600 text-white')
          .with('primary', () => 'bg-primary text-white')
          .with('success', () => 'bg-green-600 text-white')
          .exhaustive()
      )
      .with('secondary', () =>
        match(color)
          .with('error', () => 'text-red-600')
          .with('primary', () => 'text-primary')
          .with('success', () => 'text-green-600')
          .exhaustive()
      )
      .exhaustive()
  );
}

// Button Group

type ButtonGroupProps = PropsWithChildren<{
  fill?: boolean;
  flexDirection?: 'row-reverse';
  spacing?: 'between' | 'center';
}>;

Button.Group = function ButtonGroup({
  children,
  fill = false,
  flexDirection,
  spacing,
}: ButtonGroupProps) {
  return (
    <div
      className={cx(
        'flex items-center gap-2',
        fill && '[>*]:flex-1 w-full',
        flexDirection === 'row-reverse' && 'flex-row-reverse',

        match(spacing)
          .with('between', () => 'justify-between')
          .with('center', () => 'justify-center')
          .with(undefined, () => 'ml-auto')
          .exhaustive()
      )}
      data-flex-direction={flexDirection}
      data-spacing={spacing}
    >
      {children}
    </div>
  );
};
