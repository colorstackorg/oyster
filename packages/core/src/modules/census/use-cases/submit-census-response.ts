import { sql } from 'kysely';

import { db } from '@oyster/db';
import { MemberType } from '@oyster/types';

import { job } from '@/infrastructure/bull/use-cases/job';
import { type SubmitCensusResponseData } from '@/modules/census/census.types';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';

export async function submitCensusResponse(
  memberId: string,
  data: SubmitCensusResponseData
) {
  const year = new Date().getFullYear();

  await db.transaction().execute(async (trx) => {
    if (data.companyId) {
      await saveCompanyIfNecessary(trx, data.companyId);
    }

    await trx
      .updateTable('students')
      .set({ type: data.hasGraduated ? MemberType.ALUMNI : MemberType.STUDENT })
      .where('id', '=', memberId)
      .execute();

    // Finally, we'll save the census response data. We're using a jsonb column
    // to be flexible with the data that we store (effectively schemaless). We
    // also want to be able to update the data if it already exists.

    // We have to format the data as a string and cast it to jsonb.
    const json = sql<string>`cast(${JSON.stringify(data)} as jsonb)`;

    await trx
      .insertInto('censusResponses')
      .values({
        json,
        studentId: memberId,
        year,
      })
      .onConflict((oc) => {
        return oc.columns(['studentId', 'year']).doUpdateSet({ json });
      })
      .execute();
  });

  job('gamification.activity.completed', {
    studentId: memberId,
    type: 'submit_census_response',
    year,
  });
}
