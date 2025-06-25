import { type SelectExpression } from 'kysely';

import { db, type DB } from '@oyster/db';

import { type ListCompanyReviewsWhere } from '@/modules/employment/employment.types';

type ListCompanyReviewsOptions<Selection> = {
  includeCompanies?: boolean;
  memberId: string;
  select: Selection[];
  where: ListCompanyReviewsWhere;
};

export async function listCompanyReviews<
  Selection extends SelectExpression<
    DB,
    'companyReviews' | 'students' | 'workExperiences'
  >,
>({
  includeCompanies,
  memberId,
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
    .select([
      ...select,
      (eb) => {
        return eb
          .selectFrom('companyReviewUpvotes')
          .select(eb.fn.countAll<string>().as('count'))
          .whereRef(
            'companyReviewUpvotes.companyReviewId',
            '=',
            'companyReviews.id'
          )
          .as('upvotes');
      },
      (eb) => {
        return eb
          .exists((eb) => {
            return eb
              .selectFrom('companyReviewUpvotes')
              .whereRef(
                'companyReviewUpvotes.companyReviewId',
                '=',
                'companyReviews.id'
              )
              .where('companyReviewUpvotes.studentId', '=', memberId);
          })
          .as('upvoted');
      },
    ])
    .where('workExperiences.deletedAt', 'is', null)
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
