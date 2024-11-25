import React, {
  createRef,
  type PropsWithChildren,
  useContext,
  useRef,
  useState,
} from 'react';
import { X } from 'react-feather';

import {
  ComboboxPopoverProvider,
  useComboboxPopover,
} from './combobox-popover';
import { Divider } from './divider';
import { getInputCn, type InputProps } from './input';
import { getPillCn } from './pill';
import { type AccentColor } from '../utils/constants';
import { setInputValue } from '../utils/core';
import { cx } from '../utils/cx';

type ComboboxValue = {
  color?: AccentColor;
  label: string;
  value: string;
};

type MultiComboboxContext = {
  searchRef: React.MutableRefObject<HTMLInputElement | null>;
  setValues: (_: ComboboxValue[]) => void;
  values: ComboboxValue[];
};

const MultiComboboxContext = React.createContext<MultiComboboxContext>({
  searchRef: createRef() as MultiComboboxContext['searchRef'],
  setValues: (_: ComboboxValue[]) => {},
  values: [] as ComboboxValue[],
});

export type MultiComboboxProps = {
  children:
    | React.ReactNode
    | ((props: Pick<MultiComboboxContext, 'values'>) => React.ReactNode);

  defaultValues?: ComboboxValue[];
};

export function MultiCombobox({
  children,
  defaultValues = [],
}: MultiComboboxProps) {
  const [values, setValues] = useState<ComboboxValue[]>(defaultValues);

  const searchRef = useRef<HTMLInputElement | null>(null);

  return (
    <MultiComboboxContext.Provider
      value={{
        searchRef,
        setValues,
        values,
      }}
    >
      <ComboboxPopoverProvider>
        {typeof children === 'function' ? children({ values }) : children}
      </ComboboxPopoverProvider>
    </MultiComboboxContext.Provider>
  );
}

export function MultiComboboxDisplay({ children }: PropsWithChildren) {
  return (
    <div className={cx(getInputCn(), 'flex flex-col gap-2')}>{children}</div>
  );
}

export function MultiComboboxSearch({
  id,
  onChange,
}: Pick<InputProps, 'id' | 'onChange'>) {
  const { searchRef } = useContext(MultiComboboxContext);
  const { setPopoverOpen } = useComboboxPopover();

  return (
    <input
      autoComplete="off"
      id={id}
      onChange={(e) => {
        onChange?.(e);
      }}
      onFocus={() => {
        setPopoverOpen(true);
      }}
      ref={searchRef}
      type="text"
    />
  );
}

type MultiComboboxItemProps = PropsWithChildren<{
  color?: AccentColor;
  label: string;
  onSelect?(e: React.MouseEvent<HTMLButtonElement>): void;
  value: string;
}>;

export function MultiComboboxItem({
  children,
  color,
  label,
  onSelect,
  value,
}: MultiComboboxItemProps) {
  const { searchRef, setValues, values } = useContext(MultiComboboxContext);

  return (
    <li className="hover:bg-gray-50">
      <button
        className="w-full px-2 py-3 text-left text-sm"
        onClick={(e) => {
          onSelect?.(e);

          const alreadySelected = values.some((element) => {
            return element.value === value;
          });

          if (!alreadySelected) {
            setValues([...values, { color, label, value }]);
          }

          const searchElement = searchRef.current!;

          // After an item is selected, we should reset the search value
          // and focus the search input.
          setInputValue(searchElement, '');

          searchElement.focus();
        }}
        type="button"
        value={value}
      >
        {children}
      </button>
    </li>
  );
}

export function MultiComboboxValues({ name }: Pick<InputProps, 'name'>) {
  const { setValues, values } = useContext(MultiComboboxContext);

  if (!values.length) {
    return null;
  }

  return (
    <>
      <input
        name={name}
        type="hidden"
        value={values.map((element) => element.value).join(',')}
      />

      <ul className="flex flex-wrap gap-1">
        {values.map((value) => {
          return (
            <li
              className={cx(
                getPillCn({ color: value.color || 'pink-100' }),
                'flex items-center gap-1'
              )}
              key={value.value}
            >
              {value.label}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setValues(
                    values.filter((element) => {
                      return element.value !== value.value;
                    })
                  );
                }}
                type="button"
              >
                <X size={16} />
              </button>
            </li>
          );
        })}
      </ul>

      <Divider />
    </>
  );
}
