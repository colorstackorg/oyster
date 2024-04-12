import { db } from '@oyster/db';

import { type SubmitCensusResponseInput } from '@/modules/census/census.types';

export async function submitCensusResponse(input: SubmitCensusResponseInput) {
  await db.transaction().execute(async (trx) => {});
}
