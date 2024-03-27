import { match } from 'ts-pattern';

import { AirtableBullJob } from '@/infrastructure/bull/bull.types';
import { registerWorker } from '@/infrastructure/bull/use-cases/register-worker';
import { createAirtableMemberRecord } from './use-cases/create-airtable-member-record';
import { createAirtableRecord } from './use-cases/create-airtable-record';
import { deleteAirtableRecord } from './use-cases/delete-airtable-record';
import { updateAirtableRecord } from './use-cases/update-airtable-record';

export const airtableWorker = registerWorker(
  'airtable',
  AirtableBullJob,
  async (job) => {
    return match(job)
      .with({ name: 'airtable.record.create' }, ({ data }) => {
        return createAirtableRecord(data);
      })
      .with({ name: 'airtable.record.create.member' }, ({ data }) => {
        return createAirtableMemberRecord(data);
      })
      .with({ name: 'airtable.record.delete' }, ({ data }) => {
        return deleteAirtableRecord(data);
      })
      .with({ name: 'airtable.record.update' }, ({ data }) => {
        return updateAirtableRecord(data);
      })
      .exhaustive();
  }
);
