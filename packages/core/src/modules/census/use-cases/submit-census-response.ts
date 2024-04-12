import { sql } from 'kysely';

import { db } from '@oyster/db';
import { MemberType } from '@oyster/types';

import { type SubmitCensusResponseData } from '@/modules/census/census.types';
import { changePrimaryEmail } from '@/modules/member/use-cases/change-primary-email';

export async function submitCensusResponse(
  memberId: string,
  data: SubmitCensusResponseData
) {
  let emitPrimaryEmailChanged: VoidFunction = () => {};

  await db.transaction().execute(async (trx) => {
    const member = await trx
      .selectFrom('students')
      .select(['email'])
      .where('id', '=', memberId)
      .executeTakeFirstOrThrow();

    // If the primary email is different, then we'll change it. We already have
    // a use case to handle this, but we need to add some extra logic so that
    // we can emit an event AFTER the transaction is successful.

    if (data.email !== member.email) {
      const { emitPrimaryEmailChanged: emit } = await changePrimaryEmail(
        memberId,
        { email: data.email },
        { trx }
      );

      emitPrimaryEmailChanged = emit;
    }

    // Next, we update anything that should live directly on the member record,
    // such as the member type and school information.

    await trx
      .updateTable('students')
      .set({
        otherSchool: data.schoolId ? null : data.schoolName,
        schoolId: data.schoolId || null,
        type: data.hasGraduated ? MemberType.ALUMNI : MemberType.STUDENT,
      })
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
        year: new Date().getFullYear(),
      })
      .onConflict((oc) => {
        return oc.columns(['studentId', 'year']).doUpdateSet({ json });
      })
      .execute();
  });

  emitPrimaryEmailChanged();
}
