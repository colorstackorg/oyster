import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import React, {
  type PropsWithChildren,
  type ReactElement,
  useContext,
  useRef,
} from 'react';

import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { cx } from '../utils/cx';

const DropdownContext = React.createContext({
  _initialized: false,
});

export function useIsDropdownParent() {
  const { _initialized } = useContext(DropdownContext);

  return !!_initialized;
}

type DropdownProps = {
  align?: 'left' | 'right';
  children:
    | ReactElement<typeof DropdownMenu.Item>
    | ReactElement<typeof DropdownMenu.Item>[];
  className?: string;
  trigger: ReactElement;
};

export const Dropdown = ({
  align = 'right',
  children,
  className,
  trigger, // Destructure the trigger prop
}: DropdownProps) => {
  return (
    <DropdownContext.Provider value={{ _initialized: true }}>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
        <DropdownMenu.Content
          className={cx(
            'absolute z-20 mt-2 max-h-[300px] w-max min-w-[240px] overflow-auto rounded-lg border border-gray-200 bg-white',
            align === 'left' ? 'left-0' : 'right-0',
            className
          )}
        >
          <DropdownMenu.Group>{children}</DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
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
    <DropdownMenu.Item
      className={cx(
        'border-b border-b-gray-200 last:border-b-0',
        'dropdown-item'
      )}
    >
      {children}
    </DropdownMenu.Item>
  );
};

Dropdown.List = function DropdownList({ children }: PropsWithChildren) {
  return <DropdownMenu.Group>{children}</DropdownMenu.Group>;
};
