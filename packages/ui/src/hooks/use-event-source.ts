import { useEffect, useState } from 'react';

type EventSourceOptions = {
  enabled?: boolean;
  event: string;
};

const defaultOptions: EventSourceOptions = {
  enabled: true,
  event: 'message',
};

/**
 * Subscribe to an event source and return the latest event.
 * @param url The URL of the event source to connect to
 * @param options The options to pass to the EventSource constructor
 * @returns The last event received from the server
 */
export function useEventSource<T = any>(
  url: string | URL,
  options: EventSourceOptions = defaultOptions
) {
  const { enabled, event } = options;

  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const eventSource = new EventSource(url);

    function handler(event: MessageEvent<T>) {
      console.log('EVENT', event);
      setData(event.data);
    }

    eventSource.addEventListener(event, handler);

    return () => {
      eventSource.removeEventListener(event, handler);
      eventSource.close();
    };
  }, [enabled, url]);

  return data;
}
