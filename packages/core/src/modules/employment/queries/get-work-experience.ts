import { type SelectExpression } from 'kysely';

import { type DB, db } from '@oyster/db';

import { type WorkExperience } from '../employment.types';

type GetWorkExperienceQuery = Pick<WorkExperience, 'id' | 'studentId'>;

type GetWorkExperienceOptions = {
  withCompany?: boolean;
};

export async function getWorkExperience<
  Selection extends SelectExpression<DB, 'workExperiences'>,
>(
  { id, studentId }: GetWorkExperienceQuery,
  selections: Selection[],
  options: GetWorkExperienceOptions = {}
) {
  const workExperience = await db
    .selectFrom('workExperiences')
    .select(selections)
    .$if(!!options.withCompany, (qb) => {
      return qb
        .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
        .select([
          'companies.id as companyId',
          'companies.name as companyName',
          'companies.imageUrl as companyImageUrl',
        ]);
    })
    .where('workExperiences.id', '=', id)
    .where('workExperiences.studentId', '=', studentId)
    .executeTakeFirst();

  return workExperience;
}
