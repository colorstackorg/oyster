import { Root as Slot } from '@radix-ui/react-slot';
import React from 'react';
import { match } from 'ts-pattern';

import { type ClassName, cx } from '../utils/cx';

type IconButtonProps = Pick<
  React.HTMLProps<HTMLButtonElement>,
  'className' | 'disabled' | 'label' | 'name' | 'onClick' | 'value'
> & {
  backgroundColor?: 'gray-100';
  backgroundColorOnHover?: 'gray-100' | 'gray-200';
  icon: JSX.Element;
  shape?: 'circle' | 'square';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
};

type IconButtonComponent = React.ForwardRefExoticComponent<IconButtonProps> & {
  Slot: React.FC<IconButtonSlotProps>;
};

export const IconButton = React.forwardRef(
  (
    {
      backgroundColor,
      backgroundColorOnHover,
      className,
      disabled,
      icon,
      label = 'Icon Button',
      shape = 'circle',
      size = 'md',
      type = 'button',
      ...rest
    }: IconButtonProps,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <button
        aria-label={label}
        className={cx(
          getIconButtonCn({
            backgroundColor,
            backgroundColorOnHover,
            shape,
            size,
          }),
          className
        )}
        disabled={!!disabled}
        ref={ref}
        type={type}
        {...rest}
      >
        {icon}
      </button>
    );
  }
) as IconButtonComponent;

type IconButtonSlotProps = Pick<
  IconButtonProps,
  'backgroundColor' | 'backgroundColorOnHover' | 'shape' | 'size'
> & {
  children: React.ReactNode;
  className?: ClassName;
};

IconButton.Slot = React.forwardRef(
  (
    {
      backgroundColor,
      backgroundColorOnHover,
      children,
      className,
      shape,
      size,
      ...rest
    }: IconButtonSlotProps,
    ref: React.Ref<HTMLButtonElement>
  ) => {
    return (
      <Slot
        className={cx(
          getIconButtonCn({
            backgroundColor,
            backgroundColorOnHover,
            shape,
            size,
          }),
          className
        )}
        ref={ref}
        {...rest}
      >
        {children}
      </Slot>
    );
  }
);

export function getIconButtonCn({
  backgroundColor,
  backgroundColorOnHover,
  shape = 'circle',
  size = 'md',
}: Pick<
  IconButtonProps,
  'backgroundColor' | 'backgroundColorOnHover' | 'shape' | 'size'
>) {
  return cx(
    'flex h-fit w-fit cursor-pointer items-center justify-center',
    'disabled:cursor-not-allowed disabled:opacity-50',

    match(backgroundColor)
      .with('gray-100', () => 'bg-gray-100')
      .with(undefined, () => '')
      .exhaustive(),

    match(backgroundColorOnHover)
      .with('gray-100', () => 'hover:bg-gray-100')
      .with('gray-200', () => 'hover:bg-gray-200')
      .with(undefined, () => '')
      .exhaustive(),

    match(size)
      .with('sm', () => 'p-0.5')
      .with('md', () => 'p-1')
      .exhaustive(),

    match(shape)
      .with('circle', () => 'rounded-full')
      .with('square', () => 'rounded-md')
      .exhaustive()
  );
}
