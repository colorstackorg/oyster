import {
  Content,
  Icon,
  Item,
  ItemIndicator,
  ItemText,
  Portal,
  Root,
  ScrollDownButton,
  ScrollUpButton,
  type SelectItemProps,
  type SelectProps,
  type SelectTriggerProps,
  type SelectValueProps,
  Trigger,
  Value,
  Viewport,
} from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'react-feather';

import { getInputCn } from './input';
import { cx } from '../utils/cx';

type Props = SelectProps &
  Pick<SelectTriggerProps, 'id'> &
  Pick<SelectValueProps, 'id' | 'placeholder'>;

export function Select({
  children,
  id,
  placeholder = 'Select...',
  ...props
}: Props) {
  return (
    <Root {...props}>
      <Trigger
        className={cx(
          getInputCn(),
          'flex cursor-default items-center gap-1',
          'data-[placeholder]:text-gray-400',
          'hover:border-primary'
        )}
        id={id}
      >
        <Value placeholder={placeholder} />
        <Icon className="ml-auto">
          <ChevronDown size={16} />
        </Icon>
      </Trigger>

      <Portal>
        <Content className="w-fit max-w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-gray-50">
            <ChevronUp size={16} />
          </ScrollUpButton>

          <Viewport className="p-1">{children}</Viewport>

          <ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-gray-50">
            <ChevronDown size={16} />
          </ScrollDownButton>
        </Content>
      </Portal>
    </Root>
  );
}

export function SelectItem({ className, children, ...props }: SelectItemProps) {
  return (
    <Item
      className={cx(
        'flex select-none items-center gap-2 rounded-md p-2 text-sm',
        'data-[highlighted]:bg-primary data-[highlighted]:text-white data-[highlighted]:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      {...props}
    >
      <ItemText>{children}</ItemText>
      <ItemIndicator>
        <Check size={16} />
      </ItemIndicator>
    </Item>
  );
}
