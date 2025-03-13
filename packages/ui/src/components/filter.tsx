import { useSearchParams } from '@remix-run/react';
import React, {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Check, ChevronDown } from 'react-feather';

import { Pill, type PillProps } from './pill';
import { Text } from './text';
import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { cx } from '../utils/cx';

type PillColor = PillProps['color'];

export type FilterValue = {
  color: PillColor;
  label: string;
  value: string;
};

// Context

type FilterContext = {
  highlightedIndex: number;
  itemRefs: React.MutableRefObject<Record<number, HTMLButtonElement | null>>;
  multiple?: boolean;
  name: string;
  open: boolean;
  search: string;
  searchRef: React.MutableRefObject<HTMLInputElement | null>;
  selectedValues: FilterValue[];
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
};

const FilterContext = createContext<FilterContext>({
  highlightedIndex: 0,
  itemRefs: { current: {} },
  multiple: false,
  name: '',
  open: false,
  search: '',
  searchRef: { current: null },
  selectedValues: [],
  setHighlightedIndex: () => {},
  setOpen: () => {},
  setSearch: () => {},
  triggerRef: { current: null },
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
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const itemRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useOnClickOutside(rootRef, () => {
    close();
  });

  function close() {
    setHighlightedIndex(0);
    setOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // We need this ref because we need to use the `highlightedIndex` when
  // pressing "Enter" on a particular item...but we don't want to pass in the
  // `highlightedIndex` prop into the event listener registration since it
  // changes frequently and it could be memory intensive to re-register the
  // event listener on every change.
  const highlightedIndexRef = useRef<number>(highlightedIndex);

  useEffect(() => {
    highlightedIndexRef.current = highlightedIndex;
  }, [highlightedIndex]);

  function onKeyDown(e: KeyboardEvent) {
    if (!open) {
      return;
    }

    if (e.key === 'Escape') {
      close();

      return;
    }

    const indices = Object.keys(itemRefs.current).map(Number);

    if (indices.length === 0) {
      // This should already be 0, but setting just in case.
      setHighlightedIndex(0);

      return;
    }

    const maxIndex = Math.max(...indices);

    switch (e.key) {
      case 'ArrowDown': {
        return setHighlightedIndex((index) => {
          return index < maxIndex ? index + 1 : 0;
        });
      }

      case 'ArrowUp': {
        return setHighlightedIndex((index) => {
          return index > 0 ? index - 1 : maxIndex;
        });
      }

      case 'Enter': {
        const element = itemRefs.current[highlightedIndexRef.current];

        return element?.click();
      }

      default:
        return;
    }
  }

  return (
    <FilterContext.Provider
      value={{
        highlightedIndex,
        itemRefs,
        multiple,
        name,
        open,
        search,
        searchRef,
        selectedValues,
        setHighlightedIndex,
        setOpen,
        setSearch,
        triggerRef,
      }}
    >
      <div className="relative" ref={rootRef}>
        {children}
      </div>
    </FilterContext.Provider>
  );
}

// Filter Trigger

type FilterTriggerProps = PropsWithChildren<{
  active?: boolean;
  className?: string;
  icon: React.ReactElement;
  onClick?(): void;
  popover?: boolean;
}>;

export function FilterTrigger({
  active,
  children,
  className,
  icon,
  onClick,
  popover = true,
}: FilterTriggerProps) {
  const [_searchParams] = useSearchParams();
  const { name, open, selectedValues, setOpen, triggerRef } =
    useContext(FilterContext);

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
      ref={triggerRef}
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
  const { search, searchRef, setHighlightedIndex, setSearch } =
    useContext(FilterContext);

  return (
    <input
      autoComplete="off"
      autoFocus
      className="border-b border-b-gray-300 p-2 text-sm"
      name="search"
      onChange={(e) => {
        setSearch(e.currentTarget.value);
        setHighlightedIndex(0);
      }}
      placeholder="Search..."
      ref={searchRef}
      type="text"
      value={search}
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
  const { highlightedIndex, itemRefs } = useContext(FilterContext);

  useEffect(() => {
    if (highlightedIndex !== -1) {
      const element = itemRefs.current[highlightedIndex];

      element?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [highlightedIndex]);

  // We clone the children so that we can pass in the `index` prop to each
  // child, taking the responsibility off of the caller to do so.
  const clonedChildren = React.Children.map(children, (child, index) => {
    if (!React.isValidElement(child) || child.type !== FilterItem) {
      return null;
    }

    return React.cloneElement(child, {
      ...child.props,
      index,
    });
  });

  return (
    <ul className={cx('overflow-auto', height === 'max-h-60' && 'max-h-60')}>
      {clonedChildren}
    </ul>
  );
}

// Filter Item

type FilterItemProps = PropsWithChildren<{
  color?: PillColor;
  label: string | React.ReactElement;
  value: string;
}>;

export function FilterItem({ color, label, value, ...rest }: FilterItemProps) {
  const [_, setSearchParams] = useSearchParams();
  const {
    highlightedIndex,
    itemRefs,
    multiple,
    name,
    searchRef,
    selectedValues,
    setHighlightedIndex,
    setOpen,
    setSearch,
  } = useContext(FilterContext);

  // This is a hacky way to get the index from the props but prevent the caller
  // from accidentally passing it in.
  const index = 'index' in rest ? (rest.index as number) : -1;

  // This is the key piece that "registers" the item in our context state.
  const ref = useCallback(
    (element: HTMLButtonElement | null) => {
      if (element) {
        // Element is mounting or updating...
        itemRefs.current[index] = element;
      } else {
        // Element is unmounting...
        delete itemRefs.current[index];
      }
    },
    [index, itemRefs]
  );

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (!multiple) {
      setOpen(false);
    }

    // We'll only reset the highlighted index if the user already had some
    // search query. We won't reset if it was blank.
    if (searchRef.current?.value) {
      setHighlightedIndex(0);
    }

    setSearch('');
    searchRef.current?.focus();

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
  }

  const selected = selectedValues.some((selectedValue) => {
    return selectedValue.value === value;
  });

  return (
    <li>
      <button
        className={cx(
          'flex w-full items-center justify-between gap-4 rounded-lg p-2 text-left text-sm',
          'hover:bg-gray-50',
          'focus:bg-gray-50 focus:outline-none',
          'active:bg-gray-100',
          'data-[highlighted=true]:bg-gray-50'
        )}
        data-highlighted={index === highlightedIndex}
        onClick={onClick}
        ref={ref}
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

// Reset Filters Button

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
