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
import { cx } from '../utils/cx';

type ComboboxValue = {
  label: string;
  value: string;
};

const MultiComboboxContext = React.createContext({
  searchRef: createRef() as React.MutableRefObject<HTMLInputElement | null>,
  setValues: (_: ComboboxValue[]) => {},
  values: [] as ComboboxValue[],
});

export type MultiComboboxProps = PropsWithChildren<{
  defaultValues?: ComboboxValue[];
}>;

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
      <ComboboxPopoverProvider>{children}</ComboboxPopoverProvider>
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
  label: string;
  onSelect?(e: React.MouseEvent<HTMLButtonElement>): void;
  value: string;
}>;

export function MultiComboboxItem({
  children,
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
            setValues([...values, { label, value }]);
          }

          // After an item is selected, we should reset the search value
          // and focus the search input.
          searchRef.current!.value = '';
          searchRef.current!.focus();
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
                getPillCn({ color: 'pink-100' }),
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
