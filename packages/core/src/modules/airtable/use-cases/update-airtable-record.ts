import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import { NotFoundError } from '@/shared/errors';
import {
  airtableRateLimiter,
  getAirtableRecord,
  getMembersAirtable,
} from '../airtable.shared';

export async function updateAirtableRecord({
  newEmail,
  previousEmail,
}: GetBullJobData<'airtable.record.update'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  const record = await getAirtableRecord(previousEmail);

  if (!record) {
    throw new NotFoundError('Airtable record not found.').withContext({
      email: previousEmail,
    });
  }

  const table = getMembersAirtable();

  await airtableRateLimiter.process();

  await table.update(record.id, {
    Email: newEmail,
  });

  console.log({
    code: 'airtable_record_updated',
    message: 'Airtable record was updated.',
    data: {
      airtableId: record.id,
      previousRecord: previousEmail,
      updatedRecord: newEmail,
    },
  });
}
