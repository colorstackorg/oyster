import { match } from 'ts-pattern';

import { registerWorker } from '@/infrastructure/bull/bull';
import { EventBullJob } from '@/infrastructure/bull/bull.types';
import { onEventAttended } from './events/event-attended';
import { onRegisteredForEvent } from './events/event-registered';
import { registerForEvent } from './use-cases/register-for-event';
import { syncAirmeetEvent } from './use-cases/sync-airmeet-event';
import { syncRecentAirmeetEvents } from './use-cases/sync-recent-airmeet-events';

export const eventWorker = registerWorker(
  'event',
  EventBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'event.attended' }, ({ data }) => {
        return onEventAttended(data);
      })
      .with({ name: 'event.recent.sync' }, ({ data }) => {
        return syncRecentAirmeetEvents(data);
      })
      .with({ name: 'event.register' }, ({ data }) => {
        return registerForEvent(data);
      })
      .with({ name: 'event.registered' }, ({ data }) => {
        return onRegisteredForEvent(data);
      })
      .with({ name: 'event.sync' }, ({ data }) => {
        return syncAirmeetEvent(data);
      })
      .exhaustive();
  }
);
