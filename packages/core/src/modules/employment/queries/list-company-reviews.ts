import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListCompanyReviewsWhere } from '@/modules/employment/employment.types';

type ListCompanyReviewsOptions<Selection> = {
  includeCompanies?: boolean;
  select: Selection[];
  where: ListCompanyReviewsWhere;
};

type LimitedSelection = SelectExpression<
  DB,
  'companyReviews' | 'students' | 'workExperiences'
>;

export async function listCompanyReviews<Selection extends LimitedSelection>({
  includeCompanies,
  select,
  where,
}: ListCompanyReviewsOptions<Selection>) {
  const reviews = await db
    .selectFrom('companyReviews')
    .leftJoin(
      'workExperiences',
      'workExperiences.id',
      'companyReviews.workExperienceId'
    )
    .leftJoin('students', 'students.id', 'workExperiences.studentId')
    .select(select)
    .$if(!!includeCompanies, (qb) => {
      return qb
        .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
        .select([
          'companies.id as companyId',
          'companies.imageUrl as companyImage',
          'companies.name as companyName',
        ]);
    })
    .$if(!!where.companyId, (qb) => {
      return qb.where('workExperiences.companyId', '=', where.companyId!);
    })
    .$if(!!where.postedAfter, (qb) => {
      return qb.where('companyReviews.createdAt', '>=', where.postedAfter!);
    })
    .$if(!!where.postedBefore, (qb) => {
      return qb.where('companyReviews.createdAt', '<=', where.postedBefore!);
    })
    .orderBy('companyReviews.createdAt', 'desc')
    .execute();

  return reviews;
}
