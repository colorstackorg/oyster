import dayjs from 'dayjs';

import { db } from '@oyster/db';

type ListWorkExperiencesOptions = {
  include?: 'hasReviewed'[];
};

// TODO: Refactor this...
export async function listWorkExperiences(
  memberId: string,
  options: ListWorkExperiencesOptions = {}
) {
  const rows = await db
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'workExperiences.endDate',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationState',
      'workExperiences.locationType',
      'workExperiences.startDate',
      'workExperiences.title',
      'companies.imageUrl as companyImageUrl',
      (eb) => {
        return eb.fn
          .coalesce('companies.name', 'workExperiences.companyName')
          .as('companyName');
      },
    ])
    .$if(!!options.include?.includes('hasReviewed'), (qb) => {
      return qb
        .leftJoin(
          'companyReviews',
          'companyReviews.workExperienceId',
          'workExperiences.id'
        )
        .select((eb) => {
          return eb
            .case()
            .when('companyReviews.id', 'is not', null)
            .then(true)
            .else(false)
            .end()
            .as('hasReviewed');
        });
    })
    .where('workExperiences.studentId', '=', memberId)
    .orderBy('workExperiences.startDate', 'desc')
    .orderBy('workExperiences.endDate', 'desc')
    .execute();

  const experiences = rows.map(({ endDate, startDate, ...row }) => {
    const startMonth = dayjs.utc(startDate).format('MMMM YYYY');

    const endMonth = endDate
      ? dayjs.utc(endDate).format('MMMM YYYY')
      : 'Present';

    return {
      ...row,
      date: `${startMonth} - ${endMonth}`,
    };
  });

  return experiences;
}
