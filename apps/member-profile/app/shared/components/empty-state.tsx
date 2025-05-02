import React, { type PropsWithChildren } from 'react';

import { Text } from '@oyster/ui';

type EmptyStateProps = {
  icon: React.ReactElement;
  size?: number;
};

export const EmptyState = ({ icon, size = 48 }: EmptyStateProps) => {
  icon = React.cloneElement(icon, { size });

  return (
    <div className="rounded-full bg-gray-50 p-2">
      <div className="rounded-full bg-gray-100 p-3">{icon}</div>
    </div>
  );
};

export function EmptyStateContainer({ children }: PropsWithChildren) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-6">
      {children}
    </div>
  );
}

export function EmptyStateDescription({ children }: PropsWithChildren) {
  return (
    <Text className="text-center" color="gray-500">
      {children}
    </Text>
  );
}
