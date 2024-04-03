import { db } from '../shared/db';
import { migrate } from '../shared/migrate';

export async function setup() {
  await migrate({ db });
}

export async function teardown() {
  await db.destroy();
}
