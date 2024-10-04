import React, {
  createContext,
  createRef,
  type KeyboardEvent,
  MutableRefObject,
  type PropsWithChildren,
  useContext,
  useEffect,
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
import { getPillCn, Pill } from './pill';
import { setInputValue } from '../utils/core';
import { cx } from '../utils/cx';
import { id } from '@oyster/utils';

type ComboboxValueItem = {
  label: string;
  value: string;
};

type MultiComboboxContext = {
  searchRef: React.MutableRefObject<HTMLInputElement | null>;
  setValues: (_: ComboboxValueItem[]) => void;
  values: ComboboxValueItem[];
  selectedIdx: number;
  setSelectedIdx: (_: number) => void;
  results: ComboboxValueItem[];
  setResults: (_: ComboboxValueItem[]) => void;
  keyDown: boolean;
  setKeyDown: (_: boolean) => void;
};

const MultiComboboxContext = createContext<MultiComboboxContext>({
  searchRef: createRef() as MultiComboboxContext['searchRef'],
  setValues: (_: ComboboxValueItem[]) => {},
  values: [] as ComboboxValueItem[],
  selectedIdx: -1 as number,
  setSelectedIdx: (_: number) => {},
  results: [] as ComboboxValueItem[],
  setResults: (_: ComboboxValueItem[]) => {},
  keyDown: false as boolean,
  setKeyDown: (_: boolean) => {},
});

export type MultiComboboxProps = {
  children:
    | React.ReactNode
    | ((props: Pick<MultiComboboxContext, 'values'>) => React.ReactNode);

  defaultValues?: ComboboxValueItem[];
};

export function MultiCombobox({
  children,
  defaultValues = [],
}: MultiComboboxProps) {
  const [values, setValues] = useState<ComboboxValueItem[]>(defaultValues);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [results, setResults] = useState<ComboboxValueItem[]>([]);
  const [keyDown, setKeyDown] = useState(false);

  const searchRef = useRef<HTMLInputElement | null>(null);

  return (
    <MultiComboboxContext.Provider
      value={{
        searchRef,
        setValues,
        values,
        selectedIdx,
        setSelectedIdx,
        results,
        setResults,
        keyDown,
        setKeyDown,
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

export function MultiComboboxValues({ name }: Pick<InputProps, 'name'>) {
  const { setValues, values, searchRef } = useContext(MultiComboboxContext);

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
                  searchRef.current!.focus();
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

export function MultiComboboxSearch({
  id,
  onChange,
  items,
}: Pick<InputProps, 'id' | 'onChange'> & { items: any }) {
  const {
    searchRef,
    selectedIdx,
    setSelectedIdx,
    setKeyDown,
    values,
    setValues,
  } = useContext(MultiComboboxContext);
  const { setPopoverOpen } = useComboboxPopover();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    setKeyDown(true);

    switch (event.key) {
      case 'Enter':
        event.stopPropagation();
        event.preventDefault();
        // Add tag to MultiComboboxValues
        const alreadySelected = values.some((element) => {
          return element.value === items[selectedIdx].id;
        });

        if (!alreadySelected) {
          setValues([
            ...values,
            { label: items[selectedIdx].name, value: items[selectedIdx].id },
          ]);
        }
        break;
      case 'ArrowUp':
        event.stopPropagation();
        event.preventDefault();
        setSelectedIdx((selectedIdx + items.length - 1) % items.length);
        break;
      case 'ArrowDown':
        event.stopPropagation();
        event.preventDefault();
        setSelectedIdx((selectedIdx + 1) % items.length);
        break;
      case 'Escape':
        event.stopPropagation();
        event.preventDefault();
        setPopoverOpen(false);
        setSelectedIdx(-1);
        searchRef.current && searchRef.current.blur();
        break;
      case 'Tab':
        event.stopPropagation();
        event.preventDefault();
        setPopoverOpen(false);
        break;
      default:
        event.stopPropagation();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    event.stopPropagation();
    setKeyDown(false);
  }

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
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      ref={searchRef}
      type="text"
    />
  );
}

type MultiComboboxListProps = PropsWithChildren<{
  items: {
    id: string;
    name: string;
  }[];
}>;
export function MultiComboboxList({ children, items }: MultiComboboxListProps) {
  const { setResults, searchRef } = useContext(MultiComboboxContext);
  // const [newTagId, setNewTagId] = useState<string>(id());

  useEffect(() => {
    const parsedItems = items.map((item) => ({
      label: item.name,
      value: item.id,
    }));

    setResults(parsedItems);
  }, []);

  return (
    <ul>
      {items.map((item: { name: string; id: string }, idx: number) => {
        return (
          <MultiComboboxItem
            key={item.id}
            idx={idx}
            label={item.name}
            value={item.id}
          >
            <Pill color="pink-100">{item.name}</Pill>
          </MultiComboboxItem>
        );
      })}
    </ul>
  );
}

type MultiComboboxItemProps = PropsWithChildren<{
  label: string;
  onSelect?(e: React.MouseEvent<HTMLButtonElement>): void;
  value: string;
  idx: number;
}>;

export function MultiComboboxItem({
  children,
  label,
  onSelect,
  value,
  idx,
}: MultiComboboxItemProps) {
  const { searchRef, setValues, values, selectedIdx, setSelectedIdx, keyDown } =
    useContext(MultiComboboxContext);
  const ref: MutableRefObject<HTMLLIElement | null> = useRef(null);

  const handleScroll = () => {
    if (selectedIdx === idx && ref.current)
      ref.current.scrollIntoView({
        behavior: 'instant' as ScrollBehavior,
        block: 'nearest',
      });
  };

  useEffect(() => {
    if (selectedIdx >= 0 && keyDown) {
      handleScroll();
    }
  }, [selectedIdx]);

  return (
    <li
      className={cx(selectedIdx === idx ? 'bg-gray-50' : '')}
      onMouseOver={() => {
        if (!keyDown) setSelectedIdx(idx);
      }}
      ref={ref}
    >
      <button
        className="w-full px-2 py-3 text-left text-sm"
        onClick={(e) => {
          // onSelect?.(e);

          const alreadySelected = values.some((element) => {
            return element.value === value;
          });

          if (!alreadySelected) {
            setValues([...values, { label, value }]);
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
