import { useSearchParams } from '@remix-run/react';
import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'react-feather';

import { Pill, type PillProps } from './pill';
import { Text } from './text';
import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { setInputValue } from '../utils/core';
import { cx } from '../utils/cx';

type PillColor = PillProps['color'];

// Context

type FilterContext = {
  multiple?: boolean;
  name: string;
  open: boolean;
  search: string;
  selectedValues: FilterValue[];
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
};

const FilterContext = createContext<FilterContext>({
  multiple: false,
  name: '',
  open: false,
  search: '',
  selectedValues: [],
  setOpen: () => {},
  setSearch: () => {},
});

// Hook

export function useFilterContext() {
  return useContext(FilterContext);
}

// Filter Root

export function FilterRoot({
  children,
  multiple,
  name,
  selectedValues = [],
}: PropsWithChildren<
  Pick<FilterContext, 'multiple' | 'name' | 'selectedValues'>
>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  useOnClickOutside(ref, () => {
    setOpen(false);
    setSearch('');
  });

  return (
    <FilterContext.Provider
      value={{
        multiple,
        name,
        open,
        search,
        selectedValues,
        setOpen,
        setSearch,
      }}
    >
      <div className="relative" ref={ref}>
        {children}
      </div>
    </FilterContext.Provider>
  );
}

// Filter Button

export type FilterValue = {
  color: PillColor;
  label: string;
  value: string;
};

type FilterButtonProps = PropsWithChildren<{
  active?: boolean;
  className?: string;
  icon: React.ReactElement;
  onClick?(): void;
  popover?: boolean;
}>;

export function FilterButton({
  active,
  children,
  className,
  icon,
  onClick,
  popover = true,
}: FilterButtonProps) {
  const [_searchParams] = useSearchParams();
  const { name, open, selectedValues, setOpen } = useContext(FilterContext);

  icon = React.cloneElement(icon, {
    className: active ? '' : 'text-primary',
    size: 16,
  });

  const selectedList =
    selectedValues && selectedValues.length ? (
      <ul className="flex items-center gap-1">
        {selectedValues.map((value) => {
          // Need to create a new instance or else the search params will be
          // mutated whenever there are multiple values selected for the same
          // filter.
          const searchParams = new URLSearchParams(_searchParams);

          searchParams.delete(name, value.value);
          searchParams.delete('page');

          return (
            <li key={value.label}>
              <Pill
                color={value.color}
                onCloseHref={{ search: searchParams.toString() }}
              >
                {value.label}
              </Pill>
            </li>
          );
        })}
      </ul>
    ) : null;

  return (
    <button
      className={cx(
        'flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm',
        'focus:border-primary',
        !active && 'hover:bg-gray-50 active:bg-gray-100',
        active && 'border-primary bg-primary text-white',
        open && 'border-primary',
        className
      )}
      onClick={(e) => {
        const link = (e.target as Element).closest('a');

        // If a user clicks on the "x" link within a `Pill`, we want to prevent
        // the default behavior of opening the popover.
        if (link) {
          return;
        }

        if (onClick) {
          onClick();
        } else {
          setOpen((value) => !value);
        }
      }}
      type="button"
    >
      {icon} {children} {selectedList}{' '}
      {popover && <ChevronDown className="ml-2 text-primary" size={16} />}
    </button>
  );
}

// Filter Popover

type FilterPopoverProps = PropsWithChildren<{
  align?: 'left' | 'right';
}>;

export function FilterPopover({
  align = 'left',
  children,
}: FilterPopoverProps) {
  const { open } = useContext(FilterContext);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cx(
        'absolute top-full z-10 mt-1 flex w-max min-w-full max-w-[300px] flex-col gap-2 rounded-lg border border-gray-300 bg-white p-2',
        align === 'right' && 'right-0'
      )}
      id="popover"
    >
      {children}
    </div>
  );
}

// Filter Search

export function FilterSearch() {
  const { setSearch } = useContext(FilterContext);

  return (
    <input
      autoComplete="off"
      autoFocus
      className="border-b border-b-gray-300 p-2 text-sm"
      name="search"
      onChange={(e) => {
        setSearch(e.currentTarget.value);
      }}
      placeholder="Search..."
      type="text"
    />
  );
}

// Filter Empty Message

export function FilterEmptyMessage({ children }: PropsWithChildren) {
  return (
    <div className="p-2">
      <Text color="gray-500" variant="sm">
        {children}
      </Text>
    </div>
  );
}

// Filter List

type FilterListProps = PropsWithChildren<{
  height?: 'max' | 'max-h-60';
}>;

export function FilterList({ children, height = 'max-h-60' }: FilterListProps) {
  return (
    <ul className={cx('overflow-auto', height === 'max-h-60' && 'max-h-60')}>
      {children}
    </ul>
  );
}

// Filter Item

type FilterItemProps = PropsWithChildren<{
  color?: PillColor;
  label: string | React.ReactElement;
  value: string;
}>;

export function FilterItem({ color, label, value }: FilterItemProps) {
  const [_, setSearchParams] = useSearchParams();
  const { multiple, name, selectedValues, setOpen } = useContext(FilterContext);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!multiple) {
      setOpen(false);
    }

    setSearchParams((params) => {
      params.delete('page');

      if (multiple) {
        if (params.getAll(name).includes(e.currentTarget.value)) {
          params.delete(name, e.currentTarget.value);
        } else {
          params.append(name, e.currentTarget.value);
        }

        return params;
      }

      if (params.get(name) === e.currentTarget.value) {
        params.delete(name);
      } else {
        params.set(name, e.currentTarget.value);
      }

      return params;
    });

    const popoverElement = (e.target as Element).closest('#popover');

    const searchElement = popoverElement?.querySelector(
      'input[name="search"]'
    ) as HTMLInputElement;

    if (searchElement) {
      setInputValue(searchElement, '');
      searchElement.focus();
    }
  }

  const selected = selectedValues.some((selectedValue) => {
    return selectedValue.value === value;
  });

  return (
    <li>
      <button
        className="flex w-full items-center justify-between gap-4 rounded-lg p-2 text-left text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
        onClick={onClick}
        type="button"
        value={value}
      >
        {color ? <Pill color={color}>{label}</Pill> : label}
        <Check
          className="text-primary data-[selected=false]:invisible"
          data-selected={selected}
          size={20}
        />
      </button>
    </li>
  );
}

// Clear Filters Button

export function ResetFiltersButton() {
  const [searchParams, setSearchParams] = useSearchParams();

  if (searchParams.size === 0) {
    return null;
  }

  if (searchParams.size === 1 && searchParams.has('page')) {
    return null;
  }

  return (
    <button
      className="rounded-md p-2 text-sm text-gray-500 underline hover:bg-gray-50 active:bg-gray-100"
      onClick={() => {
        setSearchParams({});
      }}
      type="button"
    >
      Reset
    </button>
  );
}
