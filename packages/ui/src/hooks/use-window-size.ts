import { useEffect, useState } from 'react';

/**
 * The `useWindowSize` hook is a useful for retrieving and tracking the
 * dimensions of the browser window within a React component. It attaches an
 * event listener to the "resize" event, ensuring that the size is updated
 * dynamically whenever the window is resized. The hook returns the "size"
 * object, enabling components to access and utilize the window dimensions for
 * various purposes, such as responsive layout adjustments, conditional
 * rendering, or calculations based on the available space.
 *
 * @see https://usehooks.com/usewindowsize
 */
export function useWindowSize() {
  const isWindowAvailable = typeof window !== 'undefined';

  const [size, setSize] = useState({
    width: isWindowAvailable ? window.innerWidth : 0,
    height: isWindowAvailable ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
