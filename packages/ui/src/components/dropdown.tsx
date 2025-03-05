import React, {
  type PropsWithChildren,
  useContext,
  useRef,
  useState,
} from 'react';

import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { cx } from '../utils/cx';

export const DropdownContext = React.createContext({
  _initialized: false,
  open: false,
  setOpen: (_: boolean) => {},
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
  const { open } = useContext(DropdownContext);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cx(
        'absolute z-20 mt-2 max-h-[300px] w-max min-w-[240px] overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm',
        align === 'left' ? 'left-0' : 'right-0',
        className
      )}
    >
      {children}
    </div>
  );
};

Dropdown.Item = function DropdownItem({ children }: PropsWithChildren) {
  const { setOpen } = useContext(DropdownContext);

  return (
    <li
      className={cx(
        'border-b border-b-gray-200 last:border-b-0',
        'dropdown-item'
      )}
      onClick={() => {
        // Ensures that child click handlers execute first.
        requestAnimationFrame(() => {
          setOpen(false);
        });
      }}
    >
      {children}
    </li>
  );
};

Dropdown.List = function DropdownList({ children }: PropsWithChildren) {
  return <ul>{children}</ul>;
};

Dropdown.Root = function DropdownRoot({ children }: PropsWithChildren) {
  const [open, setOpen] = useState<boolean>(false);
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  useOnClickOutside(ref, () => {
    setOpen(false);
  });

  return (
    <DropdownContext.Provider value={{ _initialized: true, open, setOpen }}>
      <div className="relative" ref={ref}>
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

Dropdown.Trigger = function DropdownTrigger({ children }: PropsWithChildren) {
  const { setOpen } = useContext(DropdownContext);

  return (
    <>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child)) {
          return child;
        }

        return React.cloneElement(child, {
          // @ts-expect-error b/c we're adding an onClick handler and
          onClick: (e: React.MouseEvent) => {
            if (child.props.onClick) {
              child.props.onClick(e);
            }

            setOpen(true);
          },
        });
      })}
    </>
  );
};
