import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import { airtableRateLimiter, getAirtableInstance } from '../airtable.shared';

export async function createAirtableRecord({
  baseId,
  data,
  tableName,
}: GetBullJobData<'airtable.record.create'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  const airtable = getAirtableInstance();
  const base = airtable.base(baseId);
  const table = base(tableName);

  await airtableRateLimiter.process();

  await table.create(data, {
    // This means that if there is a select field (whether single or multi),
    // if the value we send to Airtable is not already there, it should
    // create that value instead of failing.
    typecast: true,
  });

  console.log({
    code: 'airtable_record_created',
    message: 'Airtable record was created.',
  });
}
