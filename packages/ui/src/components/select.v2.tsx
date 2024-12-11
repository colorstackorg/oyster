import {
  Content,
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  Portal,
  Root,
  ScrollDownButton,
  ScrollUpButton,
  Trigger,
  Value,
  Viewport,
} from '@radix-ui/react-select';
import type { SelectItemProps } from '@radix-ui/react-select';
import type { SelectProps as RadixSelectProps } from '@radix-ui/react-select';
import type { SelectTriggerProps } from '@radix-ui/react-select';
import { useState } from 'react';
import { Check, ChevronDown, ChevronUp } from 'react-feather';

import { getInputCn } from './input';
import { cx } from '../utils/cx';

export type SelectProps = RadixSelectProps &
  Pick<SelectTriggerProps, 'id'> & {
    defaultValue?: string;
    name?: string;
    required?: boolean;
    placeholder?: string;
    onChange?: (e: { currentTarget: { value: string } }) => void;
  };

export function Select({
  children,
  id,
  defaultValue,
  name,
  required,
  placeholder = 'Select...',
  onChange,
  ...props
}: SelectProps) {
  const [value, setValue] = useState(defaultValue);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);

    if (onChange) {
      onChange({ currentTarget: { value: newValue } });
    }
  };

  return (
    <Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={handleValueChange}
      name={name}
      required={required}
      {...props}
    >
      <Trigger
        className={cx(
          getInputCn(),
          'flex cursor-default items-center gap-1',
          'data-[placeholder]:text-gray-400',
          'hover:border-primary'
        )}
        id={id}
      >
        <Value placeholder={placeholder} />
        <Icon className="ml-auto">
          <ChevronDown size={16} />
        </Icon>
      </Trigger>

      <Portal>
        <Content className="w-fit max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-gray-50">
            <ChevronUp size={16} />
          </ScrollUpButton>

          <Viewport className="p-1">{children}</Viewport>

          <ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-gray-50">
            <ChevronDown size={16} />
          </ScrollDownButton>
        </Content>
      </Portal>
    </Root>
  );
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <Item
      className={cx(
        'flex select-none items-center gap-2 rounded-md p-2 text-sm',
        'data-[highlighted]:bg-primary data-[highlighted]:text-white data-[highlighted]:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      <ItemText>{children}</ItemText>
      <ItemIndicator className="ml-auto">
        <Check size={16} />
      </ItemIndicator>
    </Item>
  );
}
