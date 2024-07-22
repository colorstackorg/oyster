import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListCompanyReviewsWhere } from '@/modules/employment/employment.types';

type ListInterviewReviewsOptions<Selection> = {
  includeCompanies?: boolean;
  select: Selection[];
  where: ListCompanyReviewsWhere;
};

export async function listInterviewReviews<
  Selection extends SelectExpression<
    DB,
    'interviewReviews' | 'students' | 'companies'
  >,
>({ includeCompanies, select, where }: ListInterviewReviewsOptions<Selection>) {
  const reviews = await db
    .selectFrom('interviewReviews')
    .leftJoin('companies', 'companies.id', 'interviewReviews.companyId')
    .leftJoin('students', 'students.id', 'interviewReviews.studentId')
    .select(select)
    .$if(!!includeCompanies, (qb) => {
      return qb.select([
        'companies.id as companyId',
        'companies.imageUrl as companyImage',
        'companies.name as companyName',
      ]);
    })
    .$if(!!where.companyId, (qb) => {
      return qb.where('companies.id', '=', where.companyId!);
    })

    .$if(!!where.postedAfter, (qb) => {
      return qb.where('interviewReviews.createdAt', '>=', where.postedAfter!);
    })
    .$if(!!where.postedBefore, (qb) => {
      return qb.where('interviewReviews.createdAt', '<=', where.postedBefore!);
    })
    .orderBy('interviewReviews.createdAt', 'desc')
    .execute();

  return reviews;
}
