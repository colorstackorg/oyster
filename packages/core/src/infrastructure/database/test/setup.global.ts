import { db } from '@/infrastructure/database';
import { migrate } from '../shared/migrate';

export async function setup() {
  await migrate({ db });
}

export async function teardown() {
  await db.schema.dropSchema('public').cascade().execute();
  await db.schema.createSchema('public').execute();
  await db.destroy();
}
