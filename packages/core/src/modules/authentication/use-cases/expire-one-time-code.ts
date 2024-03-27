import { GetBullJobData } from '@/infrastructure/bull/bull.types';
import { db } from '@/infrastructure/database';

export async function expireOneTimeCode({
  oneTimeCodeId,
}: GetBullJobData<'one_time_code.expire'>) {
  await db.deleteFrom('oneTimeCodes').where('id', '=', oneTimeCodeId).execute();
}
