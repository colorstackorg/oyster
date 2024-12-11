import dayjs from 'dayjs';

import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import { type GetBullJobData } from '@/infrastructure/bull.types';
import { createGiftCard } from '@/modules/shopify';

export async function onMemberActivated({
  studentId,
}: GetBullJobData<'student.activated'>) {
  const member = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'id', 'lastName'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  const giftCardResult = await createGiftCard({
    expiresOn: dayjs().add(2, 'week').format('YYYY-MM-DD'),
    initialValue: '50.00',
    message:
      'Congratulations on becoming an activated ColorStack member! 🎉 ' +
      'From the team at ColorStack, we hope you enjoy your new merch! 🔥',
    note: 'This was awarded for member activation.',
    recipient: {
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
    },
  });

  if (!giftCardResult.ok) {
    throw new Error(giftCardResult.error);
  }

  job('gamification.activity.completed', {
    studentId: member.id,
    type: 'get_activated',
  });
}
