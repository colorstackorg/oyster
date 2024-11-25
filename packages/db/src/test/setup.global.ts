import { db } from '../shared/db';
import { migrate } from '../use-cases/migrate';

export async function setup() {
  await migrate({ db });
}

export async function teardown() {
  await db.destroy();
}
