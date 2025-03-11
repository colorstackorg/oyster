import { useSearchParams } from '@remix-run/react';
import React, {
  createContext,
  type PropsWithChildren,
  useContext,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown, X } from 'react-feather';

import { Pill, type PillProps } from './pill';
import { Text } from './text';
import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { setInputValue } from '../utils/core';
import { cx } from '../utils/cx';

type PillColor = PillProps['color'];

// Context

type FilterContext = {
  multiple?: boolean;
  open: boolean;
  search: string;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
};

const FilterContext = createContext<FilterContext>({
  multiple: false,
  open: false,
  search: '',
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
}: PropsWithChildren<Pick<FilterContext, 'multiple'>>) {
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
        open,
        search,
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
  selectedValues?: FilterValue[];
}>;

export function FilterButton({
  active,
  children,
  className,
  icon,
  onClick,
  popover,
  selectedValues = [],
}: FilterButtonProps) {
  const { open, setOpen } = useContext(FilterContext);

  icon = React.cloneElement(icon, {
    className: active ? '' : 'text-primary',
    size: 16,
  });

  const selectedList =
    selectedValues && selectedValues.length ? (
      <ul className="flex items-center gap-1">
        {selectedValues.map((value) => {
          return (
            <li key={value.label}>
              <Pill color={value.color}>{value.label}</Pill>
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
      onClick={() => {
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
  height?: 'fixed' | 'max';
}>;

export function FilterPopover({
  children,
  height = 'fixed',
}: FilterPopoverProps) {
  const { open } = useContext(FilterContext);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cx(
        'absolute top-full z-10 mt-1 flex w-max min-w-full max-w-[300px] flex-col gap-2 rounded-lg border border-gray-300 bg-white p-2',
        height === 'fixed' && 'max-h-60'
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

// Filter Item

type FilterItemProps = PropsWithChildren<{
  checked: boolean;
  color?: PillColor;
  label: string | React.ReactElement;
  name: string;
  value: string;
}>;

export function FilterItem({
  checked,
  color,
  label,
  name,
  value,
}: FilterItemProps) {
  const [_, setSearchParams] = useSearchParams();
  const { multiple, setOpen } = useContext(FilterContext);

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
          className="text-primary data-[checked=false]:invisible"
          data-checked={checked}
          size={20}
        />
      </button>
    </li>
  );
}

// Clear Filters Button

export function ClearFiltersButton() {
  const [searchParams, setSearchParams] = useSearchParams();

  if (searchParams.size === 0) {
    return null;
  }

  if (searchParams.size === 1 && searchParams.has('page')) {
    return null;
  }

  return (
    <button
      className="flex items-center gap-2 rounded-lg border border-gray-300 p-2 text-sm hover:bg-gray-50 active:bg-gray-100"
      onClick={() => {
        setSearchParams({});
      }}
      type="button"
    >
      Clear Filters <X className="text-gray-500" size={16} />
    </button>
  );
}
