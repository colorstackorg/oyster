import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';
import { id } from '@oyster/utils';

import {
  type ReferFriendInput,
  ReferralStatus,
} from '@/modules/referral/referral.types';

export { ReferFriendInput } from '@/modules/referral/referral.types';

// Queries

type GetReferralOptions<Selection> = {
  select: Selection[];
  where: Partial<{ id: string; status: ReferralStatus }>;
};

export async function getReferral<
  Selection extends SelectExpression<DB, 'referrals'>,
>({ select, where }: GetReferralOptions<Selection>) {
  const referral = await db
    .selectFrom('referrals')
    .select(select)
    .$if(!!where.id, (qb) => {
      return qb.where('id', '=', where.id as string);
    })
    .$if(!!where.status, (qb) => {
      return qb.where('status', '=', where.status as string);
    })
    .executeTakeFirst();

  return referral;
}

type ListReferralsOptions<Selection> = {
  select: Selection[];
  where: Partial<{ referrerId: string }>;
};

export async function listReferrals<
  Selection extends SelectExpression<DB, 'referrals'>,
>({ select, where }: ListReferralsOptions<Selection>) {
  const referrals = await db
    .selectFrom('referrals')
    .select(select)
    .$if(!!where.referrerId, (qb) => {
      return qb.where('referrerId', '=', where.referrerId as string);
    })
    .orderBy('referrals.referredAt', 'desc')
    .execute();

  return referrals;
}

// Use Cases

// "Refer a Friend"

export async function referFriend({
  email,
  firstName,
  lastName,
  referrerId,
}: ReferFriendInput) {
  const result = await db.transaction().execute(async (trx) => {
    const existingMember = await trx
      .selectFrom('students')
      .leftJoin('studentEmails', 'studentEmails.studentId', 'students.id')
      .where('studentEmails.email', 'ilike', email)
      .executeTakeFirst();

    if (existingMember) {
      return {
        ok: false,
        error: 'This person is already a member.',
      };
    }

    const existingReferral = await trx
      .selectFrom('referrals')
      .select(['referrerId'])
      .where('email', 'ilike', email)
      .executeTakeFirst();

    if (existingReferral) {
      return {
        ok: false,
        error:
          existingReferral.referrerId === referrerId
            ? 'You have already referred this person.'
            : 'This person has already been referred.',
      };
    }

    await trx
      .insertInto('referrals')
      .values({
        email,
        firstName,
        id: id(),
        lastName,
        referredAt: new Date(),
        referrerId,
        status: ReferralStatus.SENT,
      })
      .execute();

    return {
      ok: true,
    };
  });

  if (result.ok === false) {
    return result;
  }

  // Send email #1...

  // Send email #2...

  return result;
}
