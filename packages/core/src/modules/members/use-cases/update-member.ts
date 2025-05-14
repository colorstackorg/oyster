import { type UpdateObject } from 'kysely';

import { type DB, db, point } from '@oyster/db';
import { type Student } from '@oyster/types';

type UpdateMemberData = Omit<
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

export async function updateMember(memberId: string, data: UpdateMemberData) {
  await db.transaction().execute(async (trx) => {
    const {
      currentLocationLatitude,
      currentLocationLongitude,
      ethnicities,
      hometownLatitude,
      hometownLongitude,
      ...rest
    } = data;

    await trx
      .updateTable('students')
      .set({
        ...rest,
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
      .where('id', '=', memberId)
      .execute();

    if (ethnicities) {
      await trx
        .deleteFrom('memberEthnicities')
        .where('studentId', '=', memberId)
        .execute();

      if (ethnicities.length) {
        await trx
          .insertInto('memberEthnicities')
          .values(
            ethnicities.map((ethnicity) => {
              return {
                countryCode: ethnicity,
                studentId: memberId,
              };
            })
          )
          .execute();
      }
    }
  });
}
