import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { getSwagPackInventory } from '../swag-pack.service';

export async function notifySwagPackInventory(
  _: GetBullJobData<'swag_pack.inventory.notify'>
) {
  const [bottleInventory, hatInventory] = await Promise.all([
    getSwagPackInventory('bottle'),
    getSwagPackInventory('hat'),
  ]);

  const message =
    'Our current *SwagUp inventory* is:\n' +
    `• Swag Pack w/ Bottle: ${bottleInventory}\n` +
    `• Swag Pack w/ Hat: ${hatInventory}`;

  job('notification.slack.send', {
    message,
    workspace: 'internal',
  });
}
