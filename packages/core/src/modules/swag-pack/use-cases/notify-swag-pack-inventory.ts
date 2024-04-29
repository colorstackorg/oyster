import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { getSwagPackInventory } from '../swag-pack.service';

export async function notifySwagPackInventory(
  _: GetBullJobData<'swag_pack.inventory.notify'>
) {
  const inventory = await getSwagPackInventory();

  job('notification.slack.send', {
    message: `Our current SwagUp inventory is: *${inventory}*`,
    workspace: 'internal',
  });
}
