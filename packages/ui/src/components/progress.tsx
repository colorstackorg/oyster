import { Indicator, type ProgressProps, Root } from '@radix-ui/react-progress';
import { useEffect, useState } from 'react';

export function Progress({ max = 100, value, ...props }: ProgressProps) {
  const translateX = 100 - (value || 0);

  return (
    <Root
      className="relative h-2 w-full overflow-hidden rounded-full bg-gray-100"
      max={max}
      value={value}
      {...props}
    >
      <Indicator
        className="h-full w-full bg-primary transition-transform delay-700"
        style={{
          // We'll effectively "push" the indicator to the left by the inverse,
          // but it doesn't show because of the "overflow-hidden" on the parent.
          transform: `translateX(-${translateX}%)`,
        }}
      />
    </Root>
  );
}

type ProgressOptions = {
  /**
   * The cooling factor to apply to the progress. This is a number between 0 and
   * 1 that determines how much the progress should slow down as it approaches
   * 100%.
   *
   * @default 0.03
   */
  coolingFactor?: number;
};

const defaultOptions: Required<ProgressOptions> = {
  coolingFactor: 0.03,
};

/**
 * Returns a progress value that increments over time. The value will slow down
 * according to the cooling factor as it approaches 100%. The progress will be
 * updated every second.
 */
export function useProgress(options: ProgressOptions = {}) {
  const { coolingFactor } = {
    ...defaultOptions,
    ...options,
  };

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((value) => {
        // Increment the progress by x% of the remaining value. This is
        // effectively a "cooling" effect that slows down more as it approaches
        // 100%.
        const increment = (100 - value) * coolingFactor;

        return value + increment;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return progress;
}
