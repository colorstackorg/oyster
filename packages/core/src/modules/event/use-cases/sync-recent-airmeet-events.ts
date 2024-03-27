import dayjs from 'dayjs';

import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { listAirmeetEvents } from '../airmeet-event.service';

export async function syncRecentAirmeetEvents(
  _: GetBullJobData<'event.recent.sync'>
) {
  const events = await listAirmeetEvents({
    startsAfter: dayjs().subtract(3, 'day').toDate(),
    startsBefore: new Date(),
  });

  events.forEach(async (event) => {
    job('event.sync', {
      eventId: event.id,
    });
  });
}
