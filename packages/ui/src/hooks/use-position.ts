import { type RefObject, useEffect, useState } from 'react';

type Position = {
  x: number;
  y: number;
};

/**
 * Hook to track the position of an element. This takes into account the
 * element's position relative to the viewport, as well as the scroll position
 * of the page.
 *
 * @param ref - The reference to the element to track.
 * @returns The position of the element.
 */
export function usePosition(ref: RefObject<HTMLElement>): Position {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const updatePosition = () => {
      const { x, y } = element.getBoundingClientRect();

      setPosition({ x, y });
    };

    updatePosition();

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [ref]);

  return position;
}
