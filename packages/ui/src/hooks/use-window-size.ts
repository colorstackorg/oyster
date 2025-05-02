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
  const [size, setSize] = useState({
    height: 0,
    width: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Set the initial size upon mounting.
    handleResize();

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
