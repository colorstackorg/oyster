import { id } from '@colorstack/utils';

import { db } from '@/infrastructure/database';
import { CreateSchoolInput } from '../education.types';

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
