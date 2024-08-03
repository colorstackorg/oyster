import { db } from '@oyster/db';

import { type GetBullJobData } from '@/infrastructure/bull/bull.types';

export async function expireOneTimeCode({
  oneTimeCodeId,
}: GetBullJobData<'one_time_code.expire'>) {
  await db.deleteFrom('oneTimeCodes').where('id', '=', oneTimeCodeId).execute();
}
