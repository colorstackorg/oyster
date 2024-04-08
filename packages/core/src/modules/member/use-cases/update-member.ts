import { type Transaction, type UpdateObject } from 'kysely';

import { db, point, type DB } from '@oyster/db';
import { type Student } from '@oyster/types';

type UpdateMemberOptions = {
  data: Omit<UpdateObject<DB, 'students'>, 'currentLocationCoordinates'> &
    Partial<
      Pick<Student, 'currentLocationLatitude' | 'currentLocationLongitude'>
    >;
  trx?: Transaction<DB>;
  where: Pick<Student, 'id'>;
};

export async function updateMember({
  trx,
  where,
  ...options
}: UpdateMemberOptions) {
  await db.transaction().execute(async (_trx) => {
    trx ||= _trx;

    const { currentLocationLatitude, currentLocationLongitude, ...data } =
      options.data;

    await trx
      .updateTable('students')
      .set({
        ...data,
        ...(currentLocationLatitude &&
          currentLocationLongitude && {
            currentLocationCoordinates: point({
              x: currentLocationLongitude,
              y: currentLocationLatitude,
            }),
          }),
      })
      .where('id', '=', where.id)
      .execute();
  });
}
