import React from 'react';
import { Search } from 'react-feather';

export type SearchBarProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  'defaultValue' | 'name' | 'id' | 'placeholder' | 'onChange'
>;

export function SearchBar({
  defaultValue,
  placeholder = 'Search...',
  ...rest
}: SearchBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-gray-50 p-2 sm:w-[420px]">
      <Search className="text-gray-500" size="1.25rem" />

      <input
        className="flex-1 bg-inherit [&::-webkit-search-cancel-button]:appearance-none"
        defaultValue={defaultValue}
        placeholder={placeholder}
        type="search"
        {...rest}
      />
    </div>
  );
}
