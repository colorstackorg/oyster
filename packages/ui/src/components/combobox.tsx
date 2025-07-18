import React, {
  type PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';

import {
  ComboboxPopoverProvider,
  useComboboxPopover,
} from './combobox-popover';
import { Input, type InputProps } from './input';
import { Text } from './text';
import { cx } from '../utils/cx';

const ComboboxContext = React.createContext({
  displayValue: '',
  setDisplayValue: (_: string) => {},
  setValue: (_: string) => {},
  value: '',
});

export type ComboboxProps = PropsWithChildren<{
  defaultDisplayValue?: string;
  defaultValue?: string;
}>;

export function Combobox({
  children,
  defaultDisplayValue = '',
  defaultValue = '',
}: ComboboxProps) {
  const [displayValue, setDisplayValue] = useState<string>(defaultDisplayValue);
  const [value, setValue] = useState<string>(defaultValue);

  return (
    <ComboboxContext.Provider
      value={{
        displayValue,
        setDisplayValue,
        setValue,
        value,
      }}
    >
      <ComboboxPopoverProvider>{children}</ComboboxPopoverProvider>
    </ComboboxContext.Provider>
  );
}

type ComboboxInputProps = Omit<
  InputProps,
  'defaultValue' | 'onBlur' | 'onFocus' | 'value'
> & {
  displayName?: string;
  name: string;
};

export function ComboboxInput({
  displayName,
  name,
  onChange,
  ...rest
}: ComboboxInputProps) {
  const context = useContext(ComboboxContext);
  const { setPopoverOpen } = useComboboxPopover();

  const [displayValue, setDisplayValue] = useState(context.displayValue);
  const [value, setValue] = useState(context.value);

  useEffect(() => {
    setDisplayValue(context.displayValue);
  }, [context.displayValue]);

  useEffect(() => {
    setValue(context.value);
  }, [context.value]);

  return (
    <>
      <Input
        autoComplete="off"
        name={displayName}
        onBlur={() => {
          setDisplayValue(context.displayValue);
        }}
        onChange={(e) => {
          setDisplayValue(e.currentTarget.value);
          onChange?.(e);

          if (!e.currentTarget.value) {
            context.setDisplayValue('');
            context.setValue('');
          }
        }}
        onFocus={(e) => {
          if (!e.target.readOnly) {
            setPopoverOpen(true);
          }
        }}
        value={displayValue}
        {...rest}
      />

      <input name={name} type="hidden" value={value} />
    </>
  );
}

type ComboboxItemProps = {
  className?: string;
  onSelect?(e: React.MouseEvent<HTMLButtonElement>): void;
  value: string;
} & (
  | {
      children: string;
      displayValue?: undefined;
    }
  | {
      children: React.ReactNode;
      displayValue: string;
    }
);

export function ComboboxItem({
  className,
  children,
  displayValue,
  onSelect,
  value,
}: ComboboxItemProps) {
  const { setDisplayValue, setValue } = useContext(ComboboxContext);
  const { setPopoverOpen } = useComboboxPopover();

  return (
    <li className={cx('hover:bg-gray-50', className)}>
      <button
        className="w-full px-2 py-3 text-left text-sm"
        onClick={(e) => {
          setPopoverOpen(false);
          setValue(e.currentTarget.value);
          setDisplayValue((displayValue || children) as string);
          onSelect?.(e);
        }}
        type="button"
        value={value}
      >
        {children || displayValue}
      </button>
    </li>
  );
}

export function ComboboxMessage({ children }: PropsWithChildren) {
  return (
    <div className="px-2 py-3">
      <Text color="gray-500" variant="sm">
        {children}
      </Text>
    </div>
  );
}
