import React from 'react';

export type ChatBarProps = Pick<
  React.HTMLProps<HTMLInputElement>,
  'defaultValue' | 'name' | 'id' | 'placeholder' | 'onChange' | 'value'
>;

export function ChatBar({
  defaultValue,
  placeholder = 'Search...',
  value,
  onChange,
  ...rest
}: ChatBarProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-gray-200 p-2 sm:h-[50px]">
      <input
        className="w-full flex-1 bg-inherit [&::-webkit-search-cancel-button]:appearance-none"
        defaultValue={defaultValue}
        placeholder={placeholder}
        type="search"
        value={value}
        onChange={onChange}
        {...rest}
      />
    </div>
  );
}
