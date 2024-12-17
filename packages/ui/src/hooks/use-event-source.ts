import { useEffect, useState } from 'react';

type EventSourceOptions = {
  event?: string;
};

/**
 * Subscribe to an event source and return the latest event.
 * @param url The URL of the event source to connect to
 * @param options The options to pass to the EventSource constructor
 * @returns The last event received from the server
 */
export function useEventSource<T = any>(
  url: string | URL,
  { event = 'message' }: EventSourceOptions = {}
) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(url);

    function handler(event: MessageEvent<T>) {
      setData(event.data);
    }

    eventSource.addEventListener(event, handler);

    return () => {
      eventSource.removeEventListener(event, handler);
      eventSource.close();
    };
  }, []);

  return data;
}
