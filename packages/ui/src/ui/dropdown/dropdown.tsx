import React, { PropsWithChildren, useContext, useRef } from 'react';

import { useOnClickOutside } from '../../hooks/use-on-click-outside';
import { cx } from '../../utils/cx';
import styles from './dropdown.module.scss';

const DropdownContext = React.createContext({
  _initialized: false,
});

export function useIsDropdownParent() {
  const { _initialized } = useContext(DropdownContext);
  return !!_initialized;
}

type DropdownProps = Pick<
  React.HTMLProps<HTMLElement>,
  'children' | 'className'
> & {
  align?: 'left' | 'right';
};

export const Dropdown = ({
  align = 'right',
  children,
  className,
}: DropdownProps) => {
  return (
    <DropdownContext.Provider value={{ _initialized: true }}>
      <div
        className={cx(
          'absolute z-20 mt-2 max-h-[300px] w-max min-w-[240px] overflow-scroll rounded-lg border border-gray-200 bg-white',
          align === 'left' ? 'left-0' : 'right-0',
          className
        )}
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

type DropdownContainerProps = PropsWithChildren<{
  onClose(): void;
}>;

Dropdown.Container = function DropdownContainer({
  children,
  onClose,
}: DropdownContainerProps) {
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  useOnClickOutside(ref, onClose);

  return (
    <div className="relative" ref={ref}>
      {children}
    </div>
  );
};

Dropdown.Item = function DropdownItem({ children }: PropsWithChildren) {
  return (
    <li
      className={cx(
        'border-b border-b-gray-200 last:border-b-0',
        styles.dropdownItem
      )}
    >
      {children}
    </li>
  );
};

Dropdown.List = function DropdownList({ children }: PropsWithChildren) {
  return <ul>{children}</ul>;
};
