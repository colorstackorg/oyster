import dayjs from 'dayjs';

import { db } from '@/infrastructure/database';

// TODO: Refactor this...
export async function listWorkExperiences(memberId: string) {
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
    .where('studentId', '=', memberId)
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
