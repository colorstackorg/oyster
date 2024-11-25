import React, {
  createRef,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useIsDropdownParent } from './dropdown';
import { useIsModalParent } from './modal';
import { useHydrated } from '../hooks/use-hydrated';
import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { cx } from '../utils/cx';

const ComboboxPopoverContext = React.createContext({
  popoverOpen: false,
  ref: createRef<HTMLDivElement | null>(),
  setPopoverOpen: (_: boolean) => {},
});

export function useComboboxPopover() {
  return useContext(ComboboxPopoverContext);
}

export function ComboboxPopoverProvider({ children }: PropsWithChildren) {
  const ref: React.MutableRefObject<HTMLDivElement | null> = useRef(null);

  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);

  useOnClickOutside(ref, () => {
    setPopoverOpen(false);
  });

  return (
    <ComboboxPopoverContext.Provider
      value={{
        popoverOpen,
        ref,
        setPopoverOpen,
      }}
    >
      <div className="relative" ref={ref}>
        {children}
      </div>
    </ComboboxPopoverContext.Provider>
  );
}

export function ComboboxPopover({ children }: PropsWithChildren) {
  const { popoverOpen, ref } = useComboboxPopover();

  const scroll = useScrollFromModal();

  let position: 'absolute' | 'fixed' = 'absolute';

  const isDropdownParent = useIsDropdownParent();
  const isModalParent = useIsModalParent();

  if (isDropdownParent || isModalParent) {
    position = 'fixed';
  }

  return (
    <div
      className={cx(
        'z-10 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-300 bg-white',
        position === 'fixed' ? 'fixed' : 'absolute top-full w-full',
        !popoverOpen && 'hidden'
      )}
      style={{
        ...(position === 'fixed' && {
          ...(ref.current && {
            width: ref.current.offsetWidth,
          }),
          ...(scroll && {
            transform: `translateY(-${scroll}px)`,
          }),
        }),
      }}
    >
      {children}
    </div>
  );
}

// I really don't like this solution...but it's all we got for now.

function useScrollFromModal() {
  const hydrated = useHydrated();

  let modalElement: HTMLElement | null = null;

  if (hydrated) {
    modalElement = document.getElementById('modal');
  }

  const [scrollTop, setScrollTop] = useState<number>(
    modalElement ? modalElement.scrollTop : 0
  );

  useEffect(() => {
    if (!modalElement) {
      return;
    }

    function handleScroll() {
      setScrollTop(modalElement!.scrollTop);
    }

    modalElement.addEventListener('scroll', handleScroll);

    return () => {
      modalElement!.removeEventListener('scroll', handleScroll);
    };
  }, [modalElement]);

  return scrollTop;
}
