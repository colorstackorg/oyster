import { type PropsWithChildren } from 'react';

import { cx, Text } from '@oyster/ui';

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export const Card = ({ children, className, ...rest }: CardProps) => {
  return (
    <div
      className={cx(
        'flex flex-col gap-4 rounded-2xl border border-gray-200 p-4',
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
};

Card.Description = ({ children }: PropsWithChildren) => {
  return <Text color="gray-500">{children}</Text>;
};

Card.Title = ({ children }: PropsWithChildren) => {
  return (
    <Text className="-mb-2" variant="lg" weight="500">
      {children}
    </Text>
  );
};
