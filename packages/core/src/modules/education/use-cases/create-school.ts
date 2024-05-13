import { id } from '@oyster/utils';

import { db } from '@/infrastructure/database';
import { type CreateSchoolInput } from '../education.types';

export async function createSchool({
  addressCity,
  addressState,
  addressZip,
  name,
}: CreateSchoolInput) {
  await db
    .insertInto('schools')
    .values({
      addressCity,
      addressState,
      addressZip,
      id: id(),
      name,
    })
    .execute();
}
