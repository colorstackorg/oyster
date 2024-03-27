import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle, X, XCircle } from 'react-feather';
import { match } from 'ts-pattern';

import { useHydrated } from '../../hooks/use-hydrated';
import { cx } from '../../utils/cx';
import { IconButton } from '../icon-button';
import { Text } from '../text';
import styles from './toast.module.scss';

export type ToastProps = {
  message: string;
  type: 'error' | 'success' | 'warning';
};

const iconClassName = 'h-4 w-4 text-white';

const Icon: Record<ToastProps['type'], JSX.Element> = {
  error: <XCircle className={iconClassName} />,
  success: <CheckCircle className={iconClassName} />,
  warning: <AlertCircle className={iconClassName} />,
};

export function Toast({ message, type }: ToastProps): JSX.Element | null {
  const [show, setShow] = useState<boolean>(true);

  const hydrated = useHydrated();

  useEffect(() => {
    // NOTE: If this value changes, be sure to update it in the CSS file
    // for the icon shader as well.
    const timeout = setTimeout(() => {
      setShow(false);
    }, 7000);

    return () => {
      clearTimeout(timeout);
    };
  }, []);

  if (!show) {
    return null;
  }

  if (!hydrated) {
    return null;
  }

  function onClickClose() {
    setShow(false);
  }

  return createPortal(
    <aside className={styles.toast} role="alert">
      <div
        className={cx(
          'relative box-border flex items-center justify-center rounded bg-[var(--background-color)] p-1',

          match(type)
            .with('error', () => 'bg-red-600')
            .with('success', () => 'bg-green-600')
            .with('warning', () => 'bg-yellow-400')
            .exhaustive()
        )}
      >
        {Icon[type]}
        <span className={styles.toastIconShader} />
      </div>

      <Text color="white" variant="sm">
        {message}
      </Text>

      <IconButton
        className="h-6 w-6 text-white"
        label="Close Toast Button"
        icon={<X className="h-5 w-5" />}
        onClick={onClickClose}
      />
    </aside>,

    document.body
  );
}
