import { match } from 'ts-pattern';

import { SwagPackBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { notifySwagPackInventory } from './use-cases/notify-swag-pack-inventory';

export const swagPackWorker = registerWorker(
  'swag_pack',
  SwagPackBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'swag_pack.inventory.notify' }, ({ data }) => {
        return notifySwagPackInventory(data);
      })
      .exhaustive();
  }
);
