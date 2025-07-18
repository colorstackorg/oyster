import { sql } from 'kysely';

import { db } from '@oyster/db';

import { type ListMembersInDirectoryWhere } from '@/modules/members/members.types';

type GetMembersOptions = {
  limit: number;
  page: number;
  where: ListMembersInDirectoryWhere; // TODO: These should all be optional...
};

export async function listMembersInDirectory(options: GetMembersOptions) {
  const { limit, page, where } = options;
  const {
    company,
    ethnicity,
    graduationYear,
    hometownLatitude,
    hometownLongitude,
    joinedDirectoryAfter,
    joinedDirectoryBefore,
    locationLatitude,
    locationLongitude,
    school,
    search,
  } = where || {};

  const query = db
    .selectFrom('students')
    .$if(!!search, (query) => {
      return query.where((eb) => {
        return eb.or([
          eb('students.email', 'ilike', `%${search}%`),
          eb('students.firstName', 'ilike', `%${search}%`),
          eb('students.headline', 'ilike', `%${search}%`),
          eb('students.lastName', 'ilike', `%${search}%`),
          eb('students.preferredName', 'ilike', `%${search}%`),
          eb(sql`first_name || ' ' || last_name`, 'ilike', `%${search}%`),
        ]);
      });
    })
    .$if(!!company, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFrom('workExperiences')
            .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
            .whereRef('workExperiences.studentId', '=', 'students.id')
            .where('companies.id', '=', company)
            .where('workExperiences.deletedAt', 'is', null)
        );
      });
    })
    .$if(!!ethnicity, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFrom('memberEthnicities')
            .whereRef('memberEthnicities.studentId', '=', 'students.id')
            .where('memberEthnicities.countryCode', '=', ethnicity)
        );
      });
    })
    .$if(!!graduationYear?.length, (query) => {
      return query.where(
        'students.graduationYear',
        'in',
        graduationYear.map(String)
      );
    })
    .$if(!!hometownLatitude && !!hometownLongitude, (query) => {
      return query.where(
        sql`students.hometown_coordinates <@> point(${hometownLongitude}, ${hometownLatitude})`,
        '<=',
        25
      );
    })
    .$if(!!locationLatitude && !!locationLongitude, (query) => {
      return query.where(
        sql`students.current_location_coordinates <@> point(${locationLongitude}, ${locationLatitude})`,
        '<=',
        25
      );
    })
    .$if(!!school, (query) => {
      return query.where((eb) => {
        return eb.or([
          eb('students.schoolId', '=', school),
          eb.exists(
            eb
              .selectFrom('educations')
              .whereRef('educations.studentId', '=', 'students.id')
              .where('educations.schoolId', '=', school)
              .where('educations.deletedAt', 'is', null)
          ),
        ]);
      });
    })
    .$if(!!joinedDirectoryAfter, (query) => {
      return query.where(
        'joinedMemberDirectoryAt',
        '>=',
        joinedDirectoryAfter!
      );
    })
    .$if(!!joinedDirectoryBefore, (query) => {
      return query.where(
        'joinedMemberDirectoryAt',
        '<=',
        joinedDirectoryBefore!
      );
    })
    .where('joinedMemberDirectoryAt', 'is not', null);

  const [members, { count }] = await Promise.all([
    query
      .select([
        'students.firstName',
        'students.headline',
        'students.id',
        'students.lastName',
        'students.preferredName',
        'students.profilePicture',
      ])
      .orderBy('students.joinedMemberDirectoryAt', 'desc')
      .limit(limit)
      .offset((page - 1) * limit)
      .execute(),

    query
      .select((eb) => eb.fn.countAll().as('count'))
      .executeTakeFirstOrThrow(),
  ]);

  return {
    members,
    totalCount: Number(count),
  };
}
