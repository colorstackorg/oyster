import { SelectExpression } from 'kysely';
import { DB } from 'kysely-codegen/dist/db';

import { db } from '@/infrastructure/database';
import { WorkExperience } from '../employment.types';

type GetWorkExperienceQuery = Pick<WorkExperience, 'id' | 'studentId'>;

type GetWorkExperienceOptions = {
  withCompany?: boolean;
};

export async function getWorkExperience<
  Selection extends SelectExpression<DB, 'workExperiences'>
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
          'companies.crunchbaseId as companyCrunchbaseId',
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
