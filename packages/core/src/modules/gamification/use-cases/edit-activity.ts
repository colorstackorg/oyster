import type { Activity } from '@oyster/types';

import { db } from '@/infrastructure/database';

type EditActivityInput = Pick<
  Activity,
  'description' | 'id' | 'name' | 'period' | 'points' | 'type'
>;

export async function editActivity({
  description,
  id,
  name,
  period,
  points,
  type,
}: EditActivityInput) {
  await db
    .updateTable('activities')
    .set({
      description,
      name,
      period,
      points,
      type,
    })
    .where('id', '=', id)
    .execute();
}
