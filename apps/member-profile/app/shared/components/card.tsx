import { type PropsWithChildren } from 'react';

import { cx, Text } from '@oyster/ui';

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export const Card = ({ children, className, ...rest }: CardProps) => {
  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-3xl border border-gray-200 p-4',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.Description = function Description({ children }: PropsWithChildren) {
  return <Text color="gray-500">{children}</Text>;
};

Card.Header = function Header({ children }: PropsWithChildren) {
  return <header className="flex justify-between gap-4">{children}</header>;
};

Card.Title = function Title({ children }: PropsWithChildren) {
  return (
    <Text className="-mb-2" variant="lg" weight="500">
      {children}
    </Text>
  );
};
