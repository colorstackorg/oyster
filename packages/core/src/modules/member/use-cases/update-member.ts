import { type Transaction, type UpdateObject } from 'kysely';

import { db, point, type DB } from '@oyster/db';
import { type Student } from '@oyster/types';

type UpdateMemberOptions = {
  data: Omit<
    UpdateObject<DB, 'students'>,
    'currentLocationCoordinates' | 'hometownCoordinates'
  > &
    Partial<
      Pick<
        Student,
        | 'currentLocationLatitude'
        | 'currentLocationLongitude'
        | 'hometownLatitude'
        | 'hometownLongitude'
      >
    > & {
      ethnicities?: string[];
    };
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

    const {
      currentLocationLatitude,
      currentLocationLongitude,
      ethnicities,
      hometownLatitude,
      hometownLongitude,
      ...data
    } = options.data;

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
        ...(hometownLatitude &&
          hometownLongitude && {
            hometownCoordinates: point({
              x: hometownLongitude,
              y: hometownLatitude,
            }),
          }),
      })
      .where('id', '=', where.id)
      .execute();

    if (ethnicities) {
      await trx
        .deleteFrom('memberEthnicities')
        .where('studentId', '=', where.id)
        .execute();

      if (ethnicities.length) {
        await trx
          .insertInto('memberEthnicities')
          .values(
            ethnicities.map((ethnicity) => {
              return {
                countryCode: ethnicity,
                studentId: where.id,
              };
            })
          )
          .execute();
      }
    }
  });
}
