import {
  Range,
  Root,
  type SliderProps,
  Thumb,
  Track,
} from '@radix-ui/react-slider';

export function Slider(props: SliderProps) {
  return (
    <Root className="relative flex h-6 w-full items-center" {...props}>
      <Track className="relative h-1 grow rounded-full bg-gray-300">
        <Range className="absolute h-full rounded-full bg-primary" />
      </Track>
      <Thumb className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-white focus:outline-none" />
    </Root>
  );
}
