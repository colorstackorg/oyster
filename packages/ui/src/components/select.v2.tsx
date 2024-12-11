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
  type SelectItemProps,
  type SelectProps as RadixSelectProps,
  type SelectTriggerProps,
  Trigger,
  Value,
  Viewport,
} from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'react-feather';
import { useState } from 'react';

import { getInputCn } from './input';
import { cx } from '../utils/cx';

export type SelectProps = RadixSelectProps &
  Pick<SelectTriggerProps, 'id'> & {
    defaultValue?: string;
    name?: string;
    required?: boolean;
    placeholder?: string;
    onChange?: (event: { currentTarget: { value: string } }) => void;
  };

type OptionProps = {
  children: React.ReactNode;
  value: string;
  disabled?: boolean;
};

function Option({ children, value, disabled }: OptionProps) {
  return (
    <Item value={value} disabled={disabled}>
      <ItemText>{children}</ItemText>
      <ItemIndicator className="ml-auto">
        <Check size={16} />
      </ItemIndicator>
    </Item>
  );
}

function SelectComponent({
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

SelectComponent.Option = Option;

export const Select = SelectComponent;
