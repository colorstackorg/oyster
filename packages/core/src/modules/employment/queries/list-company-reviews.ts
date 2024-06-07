import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListCompanyReviewsWhere } from '@/modules/employment/employment.types';

type ListCompanyReviewsOptions<Selection> = {
  select: Selection[];
  where: ListCompanyReviewsWhere;
};

export async function listCompanyReviews<
  Selection extends SelectExpression<
    DB,
    'companyReviews' | 'students' | 'workExperiences'
  >,
>({ select, where }: ListCompanyReviewsOptions<Selection>) {
  const companies = await db
    .selectFrom('companyReviews')
    .leftJoin(
      'workExperiences',
      'workExperiences.id',
      'companyReviews.workExperienceId'
    )
    .leftJoin('students', 'students.id', 'workExperiences.studentId')
    .select(select)
    .where('workExperiences.companyId', '=', where.companyId)
    .execute();

  return companies;
}
