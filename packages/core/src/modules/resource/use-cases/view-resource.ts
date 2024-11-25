import { db } from '@oyster/db';

import { type ViewResourceInput } from '@/modules/resource/resource.types';

export async function viewResource(id: string, input: ViewResourceInput) {
  const result = await db.transaction().execute(async (trx) => {
    await trx
      .insertInto('resourceViews')
      .values({
        resourceId: id,
        studentId: input.memberId,
      })
      .onConflict((oc) => oc.doNothing())
      .execute();
  });

  return result;
}
