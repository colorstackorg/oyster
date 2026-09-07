import { db } from '@oyster/db';

import { fail, success } from '@/shared/utils/core';

export async function deleteCompany(id: string) {
  const company = await db
    .selectFrom('companies')
    .select(['id', 'name'])
    .where('id', '=', id)
    .executeTakeFirst();

  if (!company) {
    return fail({
      code: 404,
      error: 'Company not found.',
    });
  }

  const [
    workExperiences,
    fullTimeOffers,
    internshipOffers,
    preferredSponsorSubmissions,
  ] = await Promise.all([
    db
      .selectFrom('workExperiences')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('companyId', '=', id)
      .where('deletedAt', 'is', null)
      .executeTakeFirst(),

    db
      .selectFrom('fullTimeOffers')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('companyId', '=', id)
      .executeTakeFirst(),

    db
      .selectFrom('internshipOffers')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where('companyId', '=', id)
      .executeTakeFirst(),

    db
      .selectFrom('resumeBookSubmissions')
      .select((eb) => eb.fn.countAll<string>().as('count'))
      .where((eb) => {
        return eb.or([
          eb('preferredCompany1', '=', id),
          eb('preferredCompany2', '=', id),
          eb('preferredCompany3', '=', id),
        ]);
      })
      .executeTakeFirst(),
  ]);

  if (Number(workExperiences?.count) > 0) {
    return fail({
      code: 409,
      error: 'Cannot delete a company that has member work experiences.',
    });
  }

  if (Number(fullTimeOffers?.count) > 0) {
    return fail({
      code: 409,
      error: 'Cannot delete a company that has full-time job offers.',
    });
  }

  if (Number(internshipOffers?.count) > 0) {
    return fail({
      code: 409,
      error: 'Cannot delete a company that has internship offers.',
    });
  }

  if (Number(preferredSponsorSubmissions?.count) > 0) {
    return fail({
      code: 409,
      error:
        'Cannot delete a company that members have selected as a preferred resume book sponsor.',
    });
  }

  await db.transaction().execute(async (trx) => {
    await trx
      .deleteFrom('resumeBookSponsors')
      .where('companyId', '=', id)
      .execute();

    await trx.deleteFrom('companies').where('id', '=', id).execute();
  });

  return success({});
}
