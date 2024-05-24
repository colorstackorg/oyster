import { Link, type LinkProps } from '@remix-run/react';
import React, { type PropsWithChildren, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'react-feather';

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
}>;

export const Modal = ({
  children,
  onCloseTo,
}: ModalProps): JSX.Element | null => {
  const hydrated = useHydrated();

  if (!hydrated) {
    return null;
  }

  return createPortal(
    <ModalContext.Provider value={{ _initialized: true, onCloseTo }}>
      <div
        className={cx(
          'flex h-screen w-screen items-end justify-center sm:items-center'
        )}
      >
        <aside
          className={cx(
            'relative z-10 flex max-h-[calc(100vh-5rem)] w-full max-w-[600px] flex-col gap-4 overflow-scroll bg-white p-4',
            'animate-[modal-animation-mobile_250ms] rounded-t-lg',
            'sm:animate-[modal-animation_250ms] sm:rounded-lg'
          )}
          id="modal"
          role="dialog"
        >
          {children}
        </aside>
      </div>

      <Link
        className={cx(
          'fixed left-0 top-0 h-screen w-screen cursor-default bg-black',
          'animate-[modal-shader-animation_250ms_forwards]'
        )}
        to={onCloseTo}
      />
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
    <header className="flex items-center justify-between gap-2">
      {children}
    </header>
  );
};

Modal.Title = function ModalTitle({ children }: PropsWithChildren) {
  return <Text variant="xl">{children}</Text>;
};
