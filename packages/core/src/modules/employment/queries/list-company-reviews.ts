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
  const reviews = await db
    .selectFrom('companyReviews')
    .leftJoin(
      'workExperiences',
      'workExperiences.id',
      'companyReviews.workExperienceId'
    )
    .leftJoin('students', 'students.id', 'workExperiences.studentId')
    .select(select)
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
