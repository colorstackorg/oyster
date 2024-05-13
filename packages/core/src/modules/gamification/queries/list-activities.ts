import { db } from '@oyster/db';

export async function listActivities() {
  const activities = await db
    .selectFrom('activities')
    .select(['description', 'id', 'name', 'period', 'points', 'type'])
    .where('deletedAt', 'is', null)
    .orderBy('points', 'asc')
    .execute();

  return activities;
}
