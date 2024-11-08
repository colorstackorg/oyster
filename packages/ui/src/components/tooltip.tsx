import {
  Content,
  Portal,
  Provider,
  Root,
  type TooltipContentProps,
  type TooltipProps,
  type TooltipTriggerProps,
  Trigger,
} from '@radix-ui/react-tooltip';

import { Text, type TextProps } from './text';

export function Tooltip(props: TooltipProps) {
  return (
    <Provider delayDuration={250} skipDelayDuration={250}>
      <Root {...props} />
    </Provider>
  );
}

export function TooltipContent(props: TooltipContentProps) {
  return (
    <Portal>
      <Content
        className="max-w-xs rounded-md bg-black px-2 py-1"
        sideOffset={8}
        {...props}
      />
    </Portal>
  );
}

export function TooltipText(props: TextProps) {
  return <Text color="white" variant="xs" {...props} />;
}

export function TooltipTrigger(props: TooltipTriggerProps) {
  return <Trigger className="cursor-default" {...props} />;
}
