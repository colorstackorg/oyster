import React, { PropsWithChildren, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'react-feather';

import { useHydrated } from '../../hooks/use-hydrated';
import { cx } from '../../utils/cx';
import { IconButton } from '../icon-button';
import { Text } from '../text';
import styles from './modal.module.scss';

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
        <aside role="dialog" className={styles.modal} id="modal">
          {children}
        </aside>
      </div>

      <div
        aria-label="Modal Shader"
        className={styles.modalShader}
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
