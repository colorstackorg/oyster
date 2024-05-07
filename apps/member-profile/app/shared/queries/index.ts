import dayjs from 'dayjs';

import { db } from '@oyster/db';
import { toTitleCase } from '@oyster/utils';

import {
  Country,
  type DegreeType,
  FORMATTED_DEGREEE_TYPE,
} from '@/member-profile.ui';

// "educations"

export async function getEducationExperiences(id: string) {
  const rows = await db
    .selectFrom('educations')
    .leftJoin('schools', 'educations.schoolId', 'schools.id')
    .select([
      'educations.id',
      'degreeType',
      'endDate',
      'major',
      'otherMajor',
      'startDate',
      'schools.addressCity',
      'schools.addressState',
      (eb) => {
        return eb.fn
          .coalesce('schools.name', 'educations.otherSchool')
          .as('school');
      },
    ])
    .where('studentId', '=', id)
    .orderBy('startDate', 'desc')
    .execute();

  const educationExperiences = rows.map((experience) => {
    let major = '';

    if (experience.major) {
      major = toTitleCase(experience.major);
    } else {
      major = experience.otherMajor || '';
    }

    let location = null;

    if (experience.addressCity && experience.addressState) {
      location = `${experience.addressCity}, ${experience.addressState}`;
    }

    const startMonth = dayjs.utc(experience.startDate).format('MMMM YYYY');
    const endMonth = dayjs.utc(experience.endDate).format('MMMM YYYY');

    return {
      date: `${startMonth} - ${endMonth}`,
      degreeType: FORMATTED_DEGREEE_TYPE[experience.degreeType as DegreeType],
      id: experience.id,
      location,
      major,
      school: experience.school,
    };
  });

  return educationExperiences;
}

// "member_ethnicities"

export async function getMemberEthnicities(id: string) {
  const rows = await db
    .selectFrom('memberEthnicities')
    .leftJoin('countries', 'countries.code', 'memberEthnicities.countryCode')
    .select(['countries.code', 'countries.demonym', 'countries.flagEmoji'])
    .where('memberEthnicities.studentId', '=', id)
    .execute();

  const ethnicities = rows.map((row) => {
    return Country.pick({
      code: true,
      demonym: true,
      flagEmoji: true,
    }).parse(row);
  });

  return ethnicities;
}

// "students"

type GetMemberOptions = {
  school?: boolean;
};

export function getMember(id: string, options: GetMemberOptions = {}) {
  return db
    .selectFrom('students')
    .where('students.id', '=', id)
    .$if(!!options.school, (qb) => {
      return qb
        .leftJoin('schools', 'students.schoolId', 'schools.id')
        .select((eb) => {
          return eb.fn
            .coalesce('schools.name', 'students.otherSchool')
            .as('school');
        });
    });
}

// "check membership of github user"

export async function checkGitHubIdExists(gitHubId: number) {
  try {
    const rows = await db
      .selectFrom('students')
      .where('students.githubId', '=', gitHubId)
      .execute();

    return rows.length > 0; // Return true if the GitHub ID exists, false otherwise
  } catch (error) {
    return false; // Return false in case of any error
  }
}
