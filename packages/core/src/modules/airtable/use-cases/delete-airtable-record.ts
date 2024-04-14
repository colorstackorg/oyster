import { type GetBullJobData } from '@/infrastructure/bull/bull.types';
import { IS_PRODUCTION } from '@/shared/env';
import { NotFoundError } from '@/shared/errors';
import {
  airtableRateLimiter,
  getAirtableRecord,
  getMembersAirtable,
} from '../airtable.shared';

export async function deleteAirtableRecord({
  email,
}: GetBullJobData<'airtable.record.delete'>) {
  if (!IS_PRODUCTION) {
    return;
  }

  const record = await getAirtableRecord(email);

  if (!record) {
    throw new NotFoundError('Airtable record not found.').withContext({
      email,
    });
  }

  const table = getMembersAirtable();

  await airtableRateLimiter.process();

  await table.destroy(record.id);

  console.log({
    code: 'airtable_record_deleted',
    message: 'Airtable record was deleted.',
    data: {
      airtableId: record.id,
      email,
    },
  });
}
