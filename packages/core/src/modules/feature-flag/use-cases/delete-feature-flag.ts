import { db } from '@oyster/db';

export async function deleteFeatureFlag(id: number) {
  await db.deleteFrom('featureFlags').where('id', '=', id).execute();
}
