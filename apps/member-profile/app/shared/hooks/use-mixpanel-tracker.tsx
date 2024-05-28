import { useFetcher } from '@remix-run/react';

import {
  type MixpanelEvent,
  type TrackInput,
} from '@oyster/infrastructure/mixpanel';

export function useMixpanelTracker() {
  const fetcher = useFetcher();

  function trackFromClient<Event extends keyof MixpanelEvent>({
    event,
    properties,
  }: Omit<TrackInput<Event>, 'request' | 'user'>) {
    fetcher.submit(
      {
        event,
        ...(properties && { properties }),
      },
      {
        action: '/api/mixpanel/track',
        encType: 'application/json',
        method: 'post',
      }
    );
  }

  return {
    trackFromClient,
  };
}
