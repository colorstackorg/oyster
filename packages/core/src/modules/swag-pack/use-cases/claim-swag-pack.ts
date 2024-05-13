import { db } from '@/infrastructure/database';
import { orderSwagPack } from '../swag-pack.service';
import { type ClaimSwagPackInput } from '../swag-pack.types';

export async function claimSwagPack({
  addressCity,
  addressLine1,
  addressLine2,
  addressState,
  addressZip,
  studentId,
}: ClaimSwagPackInput) {
  const student = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'lastName'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  const swagPackOrderId = await orderSwagPack({
    contact: {
      address: {
        city: addressCity,
        line1: addressLine1,
        line2: addressLine2,
        state: addressState,
        zip: addressZip,
      },
      email: student.email,
      firstName: student.firstName,
      lastName: student.lastName,
    },
  });

  await db
    .updateTable('students')
    .set({
      addressCity,
      addressLine1,
      addressLine2,
      addressState,
      addressZip,
      claimedSwagPackAt: new Date(),
      swagUpOrderId: swagPackOrderId,
    })
    .where('id', '=', studentId)
    .execute();
}
