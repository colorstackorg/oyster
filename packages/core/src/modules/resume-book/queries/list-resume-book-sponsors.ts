import { db } from '@oyster/db';

type ListResumeBookSponsorsOptions = {
  where: { resumeBookId: string };
};

export async function listResumeBookSponsors({
  where,
}: ListResumeBookSponsorsOptions) {
  const sponsors = await db
    .selectFrom('resumeBookSponsors')
    .leftJoin('companies', 'companies.id', 'resumeBookSponsors.companyId')
    .select(['companies.id', 'companies.name'])
    .where('resumeBookId', '=', where.resumeBookId)
    .execute();

  return sponsors;
}
