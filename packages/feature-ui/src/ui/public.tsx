import { PropsWithChildren } from 'react';

import { cx } from '@colorstack/core-ui';

export const Public = () => {};

type PublicContentProps = PropsWithChildren<{
  layout?: 'md' | 'lg';
}>;

Public.Content = function Content({
  children,
  layout = 'md',
}: PublicContentProps) {
  return (
    <section
      className={cx(
        'mx-auto flex max-w-full flex-col gap-4 rounded-lg bg-white',
        `sm:border sm:border-gray-200`,
        layout === 'lg' ? 'sm:max-w-[600px] sm:p-6' : 'sm:max-w-[300px] sm:p-4'
      )}
    >
      {children}
    </section>
  );
};

Public.Layout = function Layout({ children }: PropsWithChildren) {
  return (
    <main
      className={cx(
        'min-h-screen w-screen bg-[url(/images/colorstack-background.png)] p-4',
        'sm:p-8'
      )}
    >
      {children}
    </main>
  );
};
