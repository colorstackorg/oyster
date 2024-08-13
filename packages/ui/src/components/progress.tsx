import { Indicator, type ProgressProps, Root } from '@radix-ui/react-progress';

export function Progress({ value, ...props }: ProgressProps) {
  return (
    <Root
      className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100"
      value={value}
      {...props}
    >
      <Indicator
        className="h-full w-full bg-primary transition-transform delay-700"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </Root>
  );
}
