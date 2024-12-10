import { db } from '@oyster/db';

import { job } from '@/infrastructure/bull';
import {
  AIRTABLE_FAMILY_BASE_ID,
  AIRTABLE_MEMBERS_TABLE_ID,
} from '@/modules/airtable';

export async function updateAllowEmailShare(
  id: string,
  allowEmailShare: boolean
) {
  const member = await db.transaction().execute(async (trx) => {
    return trx
      .updateTable('students')
      .set({ allowEmailShare })
      .where('id', '=', id)
      .returning(['airtableId'])
      .executeTakeFirstOrThrow();
  });

  if (member.airtableId) {
    job('airtable.record.update', {
      airtableBaseId: AIRTABLE_FAMILY_BASE_ID!,
      airtableRecordId: member.airtableId,
      airtableTableId: AIRTABLE_MEMBERS_TABLE_ID!,
      data: {
        'Share Email w/ Chapters': allowEmailShare,
      },
    });
  }
}
