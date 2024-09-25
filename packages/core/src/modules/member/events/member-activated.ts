import dayjs from 'dayjs';

import { db } from '@oyster/db';
import { id } from '@oyster/utils';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { job } from '@/infrastructure/bull/use-cases/job';
import { createGiftCard } from '@/modules/shopify';
import { ENV } from '@/shared/env';

export async function onMemberActivated({
  studentId,
}: GetBullJobData<'student.activated'>) {
  const member = await db
    .selectFrom('students')
    .select(['email', 'firstName', 'id', 'lastName'])
    .where('id', '=', studentId)
    .executeTakeFirstOrThrow();

  const giftCardResult = await createGiftCard({
    code: id() + 'oyst',
    customer: {
      email: member.email,
      firstName: member.firstName,
      lastName: member.lastName,
    },
    expiresOn: dayjs().add(1, 'week').format('YYYY-MM-DD'),
    initialValue: '50.00',
    note: 'Created via the Oyster API integration.',
    sendEmailAt: new Date().toISOString(),
  });

  if (!giftCardResult.ok) {
    throw new Error(giftCardResult.error);
  }

  job('gamification.activity.completed', {
    studentId: member.id,
    type: 'get_activated',
  });

  job('notification.email.send', {
    data: {
      firstName: member.firstName,
      studentProfileUrl: ENV.STUDENT_PROFILE_URL,
    },
    name: 'student-activated',
    to: member.email,
  });
}
