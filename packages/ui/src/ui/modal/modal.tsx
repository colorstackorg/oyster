import React, { PropsWithChildren, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'react-feather';

import { useHydrated } from '../../hooks/use-hydrated';
import { cx } from '../../utils/cx';
import { IconButton } from '../icon-button';
import { Text } from '../text';

const ModalContext = React.createContext({
  _initialized: false,
  onClose: () => {},
});

type ModalProps = PropsWithChildren<{
  onClose: VoidFunction;
}>;

export function useIsModalParent() {
  const { _initialized } = useContext(ModalContext);
  return !!_initialized;
}

export const Modal = ({
  children,
  onClose,
}: ModalProps): JSX.Element | null => {
  const hydrated: boolean = useHydrated();

  if (!hydrated) {
    return null;
  }

  return createPortal(
    <ModalContext.Provider value={{ _initialized: true, onClose }}>
      <div
        className={cx(
          'flex h-screen w-screen items-end justify-center sm:items-center'
        )}
      >
        <aside
          className={cx(
            'flex flex-col gap-4 overflow-scroll p-4 relative w-full z-10 max-w-[600px] max-h-[calc(100vh-5rem)] bg-white',
            'rounded-t-lg animate-[modal-animation-mobile_250ms]',
            'sm:rounded-lg sm:animate-[modal-animation_250ms]'
          )}
          id="modal"
          role="dialog"
        >
          {children}
        </aside>
      </div>

      <div
        aria-label="Modal Shader"
        className={cx(
          'cursor-default h-screen w-screen left-0 top-0 fixed bg-black',
          'animate-[modal-shader-animation_250ms_forwards]'
        )}
        onClick={onClose}
        role="button"
        tabIndex={0}
      />
    </ModalContext.Provider>,
    document.body
  );
};

Modal.CloseButton = function ModalCloseButton() {
  const { onClose } = useContext(ModalContext);

  return (
    <IconButton
      backgroundColor="gray-100"
      backgroundColorOnHover="gray-200"
      icon={<X />}
      onClick={onClose}
    />
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
