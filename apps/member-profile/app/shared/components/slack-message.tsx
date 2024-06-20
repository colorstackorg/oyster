import { type PropsWithChildren } from 'react';

import { Text } from '@oyster/ui';

type SlackMessageProps = PropsWithChildren;

export function SlackMessage({ children }: SlackMessageProps) {
  return <Text className="whitespace-pre-wrap">{children}</Text>;
}
