import { db } from '@/infrastructure/database';
import { getSwagPackInventory, orderSwagPack } from '../swag-pack.service';
import { ClaimSwagPackInput } from '../swag-pack.types';

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

  const swagPackType = await getSwagPackType();

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
    type: swagPackType,
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

/**
 * Returns the type of swag pack to order based on the current inventory. We'll
 * choose the `bottle` type until it runs out, then we'll switch to `hat`.
 *
 * Eventually, we'll just have 1 type of swag pack and we won't need to worry
 * about supporting multiple types.
 *
 * NOTE: THIS IS TEMPORARY AND MEANT TO BE DELETED AS SOON AS THE BOTTLE
 * INVENTORY RUNS OUT.
 */
async function getSwagPackType() {
  const bottleInventory = await getSwagPackInventory('bottle');
  return bottleInventory > 0 ? 'bottle' : 'hat';
}
