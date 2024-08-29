import dedent from 'dedent';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull/use-cases/job';
import { fail, type Result, success } from '@/shared/utils/core.utils';
import { orderSwagPack } from '../swag-pack.service';
import { type ClaimSwagPackInput } from '../swag-pack.types';

export async function claimSwagPack({
  addressCity,
  addressCountry,
  addressLine1,
  addressLine2,
  addressState,
  addressZip,
  studentId,
}: ClaimSwagPackInput): Promise<Result> {
  // We save the address regardless if the swag pack order failed or not so
  // we'll be able to send them something in the future.
  const student = await db
    .updateTable('students')
    .set({
      addressCity,
      addressCountry,
      addressLine1,
      addressLine2,
      addressState,
      addressZip,
    })
    .where('id', '=', studentId)
    .returning(['email', 'firstName', 'lastName'])
    .executeTakeFirstOrThrow();

  // Currently, SwagUp only supports the US, but not Puerto Rico.
  // See: https://support.swagup.com/en/articles/6952397-international-shipments-restricted-items
  const isAddressSupported = addressCountry === 'US' && addressState !== 'PR';

  // If the address isn't supported, then we'll send a notification to our
  // team to create a gift card manually for them.
  if (!isAddressSupported) {
    const notification = dedent`
      ${student.firstName} ${student.lastName} (${student.email}) is attempting to claim a swag pack, but they're either from Puerto Rico or Canada, which is not supported for our product.

      We let them know we'll send them a merch store gift card in the next "few days"!
    `;

    job('notification.slack.send', {
      message: notification,
      workspace: 'internal',
    });

    const error = dedent`
      Unfortunately, our swag pack provider, SwagUp, does not support shipments to Puerto Rico and Canada. Instead, we will send you a gift card to our official merch store.

      Our team has been notified, please give us a few days to complete this request!
    `;

    return fail({
      code: 400,
      error,
    });
  }

  const swagPackOrderId = await orderSwagPack({
    contact: {
      address: {
        city: addressCity,
        country: addressCountry,
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
      claimedSwagPackAt: new Date(),
      swagUpOrderId: swagPackOrderId,
    })
    .where('id', '=', studentId)
    .execute();

  return success({});
}
