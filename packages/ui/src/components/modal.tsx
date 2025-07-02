import React, { type PropsWithChildren, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'react-feather';
import { Link, type LinkProps } from 'react-router';

import { getIconButtonCn } from './icon-button';
import { Text } from './text';
import { useHydrated } from '../hooks/use-hydrated';
import { cx } from '../utils/cx';

const ModalContext = React.createContext({
  _initialized: false,
  onCloseTo: '' as LinkProps['to'],
});

export function useIsModalParent() {
  const { _initialized } = useContext(ModalContext);

  return !!_initialized;
}

type ModalProps = PropsWithChildren<{
  onCloseTo: LinkProps['to'];
  size?: '400' | '600';
}>;

export const Modal = ({
  children,
  onCloseTo,
  size = '600',
}: ModalProps): JSX.Element | null => {
  const hydrated = useHydrated();

  if (!hydrated) {
    return null;
  }

  return createPortal(
    <ModalContext.Provider value={{ _initialized: true, onCloseTo }}>
      <div
        className={cx(
          'fixed flex h-screen w-screen justify-center',
          'bottom-0 items-end', // Mobile
          'sm:top-0 sm:items-center' // > Mobile
        )}
      >
        <aside
          className={cx(
            'lock-scroll relative z-10 flex max-h-[calc(100vh-5rem)] w-full flex-col gap-4 overflow-auto bg-white p-4',
            'animate-[modal-animation-mobile_300ms] rounded-t-lg',
            'sm:animate-[modal-animation_300ms] sm:rounded-lg',
            size === '400' && 'sm:max-w-[400px]',
            size === '600' && 'sm:max-w-[600px]'
          )}
          id="modal"
          role="dialog"
        >
          {children}
        </aside>

        <Link
          className={cx(
            'absolute inset-0 cursor-default bg-black',
            'animate-[modal-shader-animation_300ms_forwards]'
          )}
          preventScrollReset
          to={onCloseTo}
        />
      </div>
    </ModalContext.Provider>,
    document.body
  );
};

Modal.CloseButton = function ModalCloseButton() {
  const { onCloseTo } = useContext(ModalContext);

  return (
    <Link
      className={getIconButtonCn({
        backgroundColor: 'gray-100',
        backgroundColorOnHover: 'gray-200',
      })}
      preventScrollReset
      to={onCloseTo}
    >
      <X />
    </Link>
  );
};

Modal.Description = function ModalDescription({ children }: PropsWithChildren) {
  return <Text color="gray-500">{children}</Text>;
};

Modal.Header = function ModalHeader({ children }: PropsWithChildren) {
  return (
    <header className="flex items-start justify-between gap-2">
      {children}
    </header>
  );
};

Modal.Title = function ModalTitle({ children }: PropsWithChildren) {
  return <Text variant="xl">{children}</Text>;
};
