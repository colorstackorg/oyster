import { sql, type Transaction, type Updateable } from 'kysely';
import { z } from 'zod';

import { type DB, db, point } from '@oyster/db';
import { type Major } from '@oyster/types';
import { id, run, splitArray } from '@oyster/utils';

import { track } from '@/infrastructure/mixpanel';
import { cache, ONE_WEEK_IN_SECONDS, withCache } from '@/infrastructure/redis';
import { runActor } from '@/modules/apify';
import { saveSchoolIfNecessary } from '@/modules/education/use-cases/save-school-if-necessary';
import {
  EmploymentType,
  LocationType,
} from '@/modules/employment/employment.types';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import {
  getAutocompletedCities,
  getCityDetails,
} from '@/modules/location/location';

const LinkedInDate = z.object({
  month: z.string().nullish(),
  text: z.string(),
  year: z.number(),
});

const LinkedInProfile = z.object({
  education: z.array(
    z.object({
      degree: z.string().nullish(),
      endDate: LinkedInDate.nullish(),
      fieldOfStudy: z.string().nullish(),
      schoolName: z.string(),
      schoolLinkedinUrl: z.string().url(),
      startDate: LinkedInDate.nullish(),
    })
  ),
  element: z.object({
    headline: z.string().trim(),
    location: z.object({
      parsed: z.object({
        text: z.string(),
      }),
    }),
    photo: z.string().url().nullish(),
  }),
  experience: z.array(
    z.object({
      companyId: z.string().nullish(),
      companyName: z.string(),
      companyLinkedinUrl: z.string().url(),
      description: z.string().nullish(),
      employmentType: z
        .enum([
          'Apprenticeship',
          'Contract',
          'Freelance',
          'Full-time',
          'Internship',
          'Part-time',
          'Seasonal',
          'Self-employed',
          'Volunteer',
        ])
        .nullish(),
      endDate: LinkedInDate.nullish(),
      location: z.string().nullish(),
      position: z.string(),
      startDate: LinkedInDate.nullish(),
      workplaceType: z.enum(['Hybrid', 'On-site', 'Remote']).nullish(),
    })
  ),
  originalQuery: z.object({
    query: z.string(),
  }),
});

type LinkedInProfile = z.infer<typeof LinkedInProfile>;
type LinkedInEducation = z.infer<typeof LinkedInProfile>['education'][number];
type LinkedInExperience = z.infer<typeof LinkedInProfile>['experience'][number];

export async function syncLinkedInProfiles(memberIds?: string[]) {
  const [members, educations, experiences] = await db
    .transaction()
    .execute(async (trx) => {
      return Promise.all([
        getAllMembers(trx, memberIds),
        getAllEducations(trx, memberIds),
        getAllExperiences(trx, memberIds),
      ]);
    });

  const memberMap: Record<string, Member> = {};
  const educationMap: Record<string, Education[]> = {};
  const experienceMap: Record<string, Experience[]> = {};

  members.forEach((member) => {
    memberMap[member.linkedInUrl!] = member;
  });

  educations.forEach((education) => {
    if (educationMap[education.studentId]) {
      educationMap[education.studentId].push(education);
    } else {
      educationMap[education.studentId] = [education];
    }
  });

  experiences.forEach((experience) => {
    if (experienceMap[experience.studentId]) {
      experienceMap[experience.studentId].push(experience);
    } else {
      experienceMap[experience.studentId] = [experience];
    }
  });

  const batches = splitArray(members, 100);

  for (const batch of batches) {
    const results: LinkedInProfile[] = [];

    // Need to filter through the batch and only get the ones that aren't
    // already in the cache.
    await Promise.all(
      batch.map(async (member) => {
        const profile = await cache.get<LinkedInProfile>(
          `apify:harvestapi~linkedin-profile-scraper:${member.linkedInUrl}`
        );

        if (profile) {
          results.push(profile);

          const index = batch.findIndex(({ id }) => member.id === id);

          if (index !== -1) {
            batch.splice(index, 1);
          }

          return;
        }
      })
    );

    const newProfiles = await runActor({
      actorId: 'harvestapi~linkedin-profile-scraper',
      body: { urls: batch.map((member) => member.linkedInUrl!) },
      schema: z.array(LinkedInProfile),
    });

    results.concat(newProfiles);

    await Promise.all(
      results.map(async (profile) => {
        await cache.set(
          `apify:harvestapi~linkedin-profile-scraper:${profile.originalQuery.query}`,
          profile
        );

        const member = memberMap[profile.originalQuery.query];
        const educations = educationMap[member.id];
        const experiences = experienceMap[member.id];

        let educationCreates = 0;
        let educationUpdates = 0;
        let experienceCreates = 0;
        let experienceUpdates = 0;

        await db.transaction().execute(async (trx) => {
          await Promise.all([
            checkMember({ member, profile, trx }),

            ...profile.education.map(async (educationFromLinkedIn) => {
              const result = await checkEducation({
                educationFromLinkedIn,
                educations,
                memberId: member.id,
                trx,
              });

              if (result) {
                if ('numUpdatedRows' in result) {
                  educationUpdates += 1;
                } else {
                  educationCreates += 1;
                }
              }
            }),

            ...profile.experience.map(async (experienceFromLinkedIn) => {
              const result = await checkWorkExperience({
                experienceFromLinkedIn,
                experiences,
                memberId: member.id,
                trx,
              });

              if (result) {
                if ('numUpdatedRows' in result) {
                  experienceUpdates += 1;
                } else {
                  experienceCreates += 1;
                }
              }
            }),
          ]);
        });

        track({
          event: 'LinkedIn Synced',
          properties: {
            '# of Education Creates': educationCreates,
            '# of Education Updates': educationUpdates,
            '# of Work Experience Creates': experienceCreates,
            '# of Work Experience Updates': experienceUpdates,
          },
          user: member.id,
        });
      })
    );
  }
}

type Member = Awaited<ReturnType<typeof getAllMembers>>[number];

async function getAllMembers(trx: Transaction<DB>, memberIds?: string[]) {
  return trx
    .selectFrom('students')
    .leftJoin('workExperiences', 'workExperiences.studentId', 'students.id')
    .select([
      'students.currentLocation',
      'students.headline',
      'students.id',
      'students.linkedInUrl',
      'students.profilePicture',
      ({ fn }) => fn.count('workExperiences.id').as('workExperienceCount'),
    ])
    .$if(!!memberIds?.length, (qb) => {
      return qb.where('students.id', 'in', memberIds!);
    })
    .$if(!memberIds?.length, (qb) => {
      return qb
        .where('students.linkedInUrl', 'is not', null)
        .where('students.linkedinSyncedAt', 'is', null);
    })
    .groupBy('students.id')
    .orderBy('workExperienceCount', 'asc')
    .orderBy('students.linkedinSyncedAt', sql`asc nulls first`)
    .orderBy('acceptedAt', 'asc')
    .execute();
}

type Education = Awaited<ReturnType<typeof getAllEducations>>[number];

async function getAllEducations(trx: Transaction<DB>, memberIds?: string[]) {
  return trx
    .selectFrom('educations')
    .leftJoin('schools', 'schools.id', 'educations.schoolId')
    .select([
      'educations.id',
      'educations.degreeType',
      'educations.major',
      'educations.otherMajor',
      'educations.studentId',
      'schools.linkedinId',
      ({ ref }) => {
        return sql<string>`to_char(${ref('endDate')}, 'YYYY-MM-DD')`.as(
          'endDate'
        );
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'YYYY-MM-DD')`.as(
          'startDate'
        );
      },
      ({ fn }) => {
        return fn
          .coalesce('schools.name', 'educations.otherSchool')
          .$castTo<string>()
          .as('school');
      },
    ])
    .$if(!!memberIds?.length, (qb) => {
      return qb.where('educations.studentId', 'in', memberIds!);
    })
    .where('educations.deletedAt', 'is', null)
    .orderBy('educations.startDate', 'desc')
    .orderBy('educations.endDate', 'desc')
    .execute();
}

type Experience = Awaited<ReturnType<typeof getAllExperiences>>[number];

async function getAllExperiences(trx: Transaction<DB>, memberIds?: string[]) {
  return trx
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'companies.linkedinId',
      'workExperiences.description',
      'workExperiences.employmentType',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationState',
      'workExperiences.locationType',
      'workExperiences.studentId',
      'workExperiences.title',
      ({ ref }) => {
        return sql<string>`to_char(${ref('endDate')}, 'MM')`.as('endMonth');
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('endDate')}, 'YYYY')`.as('endYear');
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('endDate')}, 'YYYY-MM-DD')`.as(
          'endDate'
        );
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'MM')`.as('startMonth');
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'YYYY')`.as(
          'startYear'
        );
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'YYYY-MM-DD')`.as(
          'startDate'
        );
      },
      ({ fn }) => {
        return fn
          .coalesce('companies.name', 'workExperiences.companyName')
          .$castTo<string>()
          .as('company');
      },
    ])
    .$if(!!memberIds?.length, (qb) => {
      return qb.where('workExperiences.studentId', 'in', memberIds!);
    })
    .where('workExperiences.deletedAt', 'is', null)
    .orderBy('workExperiences.endDate', 'desc')
    .orderBy('workExperiences.startDate', 'desc')
    .execute();
}

type CheckMemberInput = {
  member: Member;
  profile: LinkedInProfile;
  trx: Transaction<DB>;
};

async function checkMember({ member, profile, trx }: CheckMemberInput) {
  const updatedLocation = await run(async () => {
    const locationFromLinkedIn = profile.element.location.parsed.text;

    if (
      locationFromLinkedIn &&
      locationFromLinkedIn !== member.currentLocation
    ) {
      return getMostRelevantLocation(locationFromLinkedIn);
    }
  });

  return trx
    .updateTable('students')
    .set({
      ...(!member.headline && {
        headline: profile.element.headline,
      }),
      ...(!member.profilePicture && {
        profilePicture: profile.element.photo,
      }),
      ...(updatedLocation && {
        currentLocation: updatedLocation.formattedAddress,
        currentLocationCoordinates: point({
          x: updatedLocation.longitude,
          y: updatedLocation.latitude,
        }),
      }),
      linkedinSyncedAt: new Date(),
      updatedAt: new Date(),
    })
    .where('id', '=', member.id)
    .executeTakeFirst();
}

const MONTH_MAP: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

type CheckEducationInput = {
  educationFromLinkedIn: LinkedInEducation;
  educations: Education[];
  memberId: string;
  trx: Transaction<DB>;
};

async function checkEducation({
  educationFromLinkedIn,
  educations,
  memberId,
  trx,
}: CheckEducationInput) {
  // If there is no `degree` field, it likely means that the education was
  // pre-college. If there is no `fieldOfStudy` field, it likely means that
  // the education was part of a general education program. We also will require
  // that the date fields are present.
  if (
    !educationFromLinkedIn.degree ||
    !educationFromLinkedIn.fieldOfStudy ||
    !educationFromLinkedIn.endDate ||
    !educationFromLinkedIn.startDate
  ) {
    return;
  }

  const degreeType = getDegreeType(educationFromLinkedIn.degree);

  // If we don't have a matching degree type, we'll skip.
  if (!degreeType) {
    return;
  }

  const url = new URL(educationFromLinkedIn.schoolLinkedinUrl);

  // Example: https://www.linkedin.com/company/123 -> 123
  // Example: https://www.linkedin.com/school/123 -> 123
  const linkedinId = url.pathname.split('/').filter(Boolean)[1];

  // If there is no ID, it likely means that the school is not accredited so
  // we will skip syncing it.
  if (!linkedinId) {
    return;
  }

  const existingEducation = educations.find((education) => {
    if (education.degreeType !== degreeType) {
      return false;
    }

    // Usually we would just check for the exact ID match, but sometimes a
    // member on LinkedIn will link to a different account (ie: Cornell
    // University vs. Cornell University Engineering). So we'll check for
    // a close match from the school name as well.
    return (
      education.linkedinId === linkedinId ||
      education.school.includes(educationFromLinkedIn.schoolName) ||
      educationFromLinkedIn.schoolName.includes(education.school)
    );
  });

  const startDate = run(() => {
    const startMonth = educationFromLinkedIn.startDate!.month;
    const startYear = educationFromLinkedIn.startDate!.year;

    if (startYear && startMonth) {
      // The `startMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${startYear}-${MONTH_MAP[startMonth]}-01`;
    } else if (startYear) {
      // If there is no `startMonth`, we'll default to August since that's
      // when most schools start their academic year.
      return `${startYear}-08-01`;
    }

    return undefined;
  });

  const endDate = run(() => {
    const endMonth = educationFromLinkedIn.endDate!.month;
    const endYear = educationFromLinkedIn.endDate!.year;

    if (endMonth && endYear) {
      // The `endMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${endYear}-${MONTH_MAP[endMonth]}-01`;
    } else if (endYear) {
      // If there is no `endMonth`, we'll default to May since that's
      // when most schools end their academic year.
      return `${endYear}-05-01`;
    }

    return undefined;
  });

  if (existingEducation) {
    const set: Updateable<DB['educations']> = {
      updatedAt: new Date(),
    };

    if (existingEducation.linkedinId !== linkedinId) {
      const schoolId = await saveSchoolIfNecessary(trx, linkedinId);

      if (schoolId) {
        set.schoolId = schoolId;
        set.otherSchool = null;
      } else {
        set.otherSchool = educationFromLinkedIn.schoolName;
        set.schoolId = null;
      }
    }

    if (existingEducation.endDate !== endDate) {
      set.endDate = endDate;
    }

    if (existingEducation.startDate !== startDate) {
      set.startDate = startDate;
    }

    if (!Object.keys(set).length) {
      return;
    }

    return trx
      .updateTable('educations')
      .set(set)
      .where('id', '=', existingEducation.id)
      .executeTakeFirst();
  }

  const schoolId = await saveSchoolIfNecessary(trx, linkedinId);

  const major = getFieldOfStudy(educationFromLinkedIn.fieldOfStudy);

  return trx
    .insertInto('educations')
    .values({
      createdAt: new Date(),
      degreeType,
      endDate,
      id: id(),
      startDate,
      studentId: memberId,
      updatedAt: new Date(),

      ...(schoolId
        ? { schoolId }
        : { otherSchool: educationFromLinkedIn.schoolName }),

      ...(major
        ? { major }
        : { major: 'other', otherMajor: educationFromLinkedIn.fieldOfStudy }),
    })
    .executeTakeFirst();
}

/**
 * Converts a LinkedIn degree type to an Oyster degree type. This is a best
 * effort conversion and may not be 100% accurate.
 *
 * @param degree - LinkedIn degree type.
 * @returns Oyster degree type or `certificate` if the degree is not recognized.
 */
function getDegreeType(degree: string) {
  const value = degree.toLowerCase();

  if (value.includes('bachelor')) {
    return 'bachelors';
  }

  if (value.includes('master')) {
    return 'masters';
  }

  if (value.includes('doctor')) {
    return 'doctoral';
  }

  if (value.includes('associate')) {
    return 'associate';
  }

  if (value.includes('certificate')) {
    return 'certificate';
  }

  return null;
}

/**
 * Converts a LinkedIn field of study to an Oyster major. This is a best
 * effort conversion and may not be 100% accurate.
 *
 * @param fieldOfStudy - LinkedIn field of study.
 * @returns Oyster major or `null` if the field of study is not recognized.
 */
function getFieldOfStudy(fieldOfStudy: string): Major | null {
  if (fieldOfStudy.includes('Computer Science')) {
    return 'computer_science';
  }

  if (
    fieldOfStudy.includes('Computer Engineering') ||
    fieldOfStudy.includes('Electrical Engineering')
  ) {
    return 'electrical_or_computer_engineering';
  }

  if (
    fieldOfStudy.includes('Data Science') ||
    fieldOfStudy.includes('Data Analytics')
  ) {
    return 'data_science';
  }

  if (fieldOfStudy.includes('Information Science')) {
    return 'information_science';
  }

  if (fieldOfStudy.includes('Software Engineering')) {
    return 'software_engineering';
  }

  if (fieldOfStudy.includes('Cybersecurity')) {
    return 'cybersecurity';
  }

  return null;
}

// CHECKPOINT

type CheckWorkExperienceInput = {
  experienceFromLinkedIn: LinkedInExperience;
  experiences: Experience[];
  memberId: string;
  trx: Transaction<DB>;
};

async function checkWorkExperience({
  experienceFromLinkedIn,
  experiences,
  memberId,
  trx,
}: CheckWorkExperienceInput) {
  // We're going to ignore any work experiences that don't have a company ID
  // or start date for now...this errs on the side of caution.
  if (
    !experienceFromLinkedIn.companyId ||
    !experienceFromLinkedIn.startDate ||
    !experienceFromLinkedIn.startDate.year
  ) {
    return;
  }

  const existingExperience = experiences.find((experience) => {
    return doesExperienceMatch(experienceFromLinkedIn, experience);
  });

  if (existingExperience) {
    return updateWorkExperience({
      existingExperience,
      experienceFromLinkedIn,
      trx,
    });
  }

  return createWorkExperience({
    experienceFromLinkedIn,
    memberId,
    trx,
  });
}

function doesExperienceMatch(
  experienceFromLinkedIn: LinkedInExperience,
  experience: Experience
): boolean {
  // We allow for close matches to happen here simply to reduce the amount of
  // false positives (would rather update something than create a duplicate).
  if (
    experience.linkedinId !== experienceFromLinkedIn.companyId &&
    !experience.company.includes(experienceFromLinkedIn.companyName) &&
    !experienceFromLinkedIn.companyName.includes(experience.company)
  ) {
    return false;
  }

  // Now, we'll implement a "confidence" score to determine if the new
  // experience is the same as the existing experience.

  let score = 0;

  // The position name is the most important factor so if it's an exact match
  // then we'll give it a score of 2.
  if (experienceFromLinkedIn.position === experience.title) {
    score += 2;
  }

  if (
    experienceFromLinkedIn.startDate?.year &&
    experienceFromLinkedIn.startDate?.year === parseInt(experience.startYear)
  ) {
    score++;
  }

  if (
    experienceFromLinkedIn.startDate?.month &&
    MONTH_MAP[experienceFromLinkedIn.startDate.month] === experience.startMonth
  ) {
    score++;
  }

  if (
    experience.endYear &&
    experienceFromLinkedIn.endDate?.year &&
    experienceFromLinkedIn.endDate?.year === parseInt(experience.endYear)
  ) {
    score++;
  }

  if (
    experience.endMonth &&
    experienceFromLinkedIn.endDate?.month &&
    MONTH_MAP[experienceFromLinkedIn.endDate.month] === experience.endMonth
  ) {
    score++;
  }

  if (
    !experience.endYear &&
    !experience.endMonth &&
    !experienceFromLinkedIn.endDate
  ) {
    score++;
  }

  return score >= 3;
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  Apprenticeship: EmploymentType.APPRENTICESHIP,
  Contract: EmploymentType.CONTRACT,
  Freelance: EmploymentType.FREELANCE,
  'Full-time': EmploymentType.FULL_TIME,
  Internship: EmploymentType.INTERNSHIP,
  'Part-time': EmploymentType.PART_TIME,
};

const LOCATION_TYPE_MAP: Record<string, string> = {
  Hybrid: LocationType.HYBRID,
  'On-site': LocationType.IN_PERSON,
  Remote: LocationType.REMOTE,
};

type CreateWorkExperienceInput = {
  experienceFromLinkedIn: LinkedInExperience;
  memberId: string;
  trx: Transaction<DB>;
};

async function createWorkExperience({
  experienceFromLinkedIn,
  memberId,
  trx,
}: CreateWorkExperienceInput) {
  const startDate = run(() => {
    const startMonth = experienceFromLinkedIn.startDate?.month;
    const startYear = experienceFromLinkedIn.startDate?.year;

    if (startYear && startMonth) {
      // The `startMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${startYear}-${MONTH_MAP[startMonth]}-01`;
    }

    return `${startYear}-01-01`;
  });

  const endDate = run(() => {
    const endMonth = experienceFromLinkedIn.endDate?.month;
    const endYear = experienceFromLinkedIn.endDate?.year;

    if (endMonth && endYear) {
      // The `endMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${endYear}-${MONTH_MAP[endMonth]}-01`;
    } else if (endYear) {
      // If there is no `endMonth`, we'll default to December since that's
      // when most companies end their fiscal year.
      return `${endYear}-12-01`;
    }

    return undefined;
  });

  const [companyId, location] = await Promise.all([
    saveCompanyIfNecessary(trx, experienceFromLinkedIn.companyId),
    getMostRelevantLocation(experienceFromLinkedIn.location),
  ]);

  return trx
    .insertInto('workExperiences')
    .values({
      description: experienceFromLinkedIn.description,
      endDate,
      id: id(),
      linkedinSyncedAt: new Date(),
      startDate,
      studentId: memberId,
      title: experienceFromLinkedIn.position,

      ...(companyId
        ? { companyId }
        : { companyName: experienceFromLinkedIn.companyName }),

      ...(location && {
        locationCity: location.city,
        locationState: location.state,
      }),

      ...(experienceFromLinkedIn.employmentType && {
        employmentType:
          EMPLOYMENT_TYPE_MAP[experienceFromLinkedIn.employmentType],
      }),

      ...(experienceFromLinkedIn.workplaceType && {
        locationType: LOCATION_TYPE_MAP[experienceFromLinkedIn.workplaceType],
      }),
    })
    .execute();
}

type UpdateWorkExperienceInput = {
  existingExperience: Experience;
  experienceFromLinkedIn: LinkedInExperience;
  trx: Transaction<DB>;
};

async function updateWorkExperience({
  existingExperience,
  experienceFromLinkedIn,
  trx,
}: UpdateWorkExperienceInput) {
  const set: Updateable<DB['workExperiences']> = {
    linkedinSyncedAt: new Date(),
    updatedAt: new Date(),
  };

  if (existingExperience.linkedinId !== experienceFromLinkedIn.companyId) {
    const companyId = await saveCompanyIfNecessary(
      trx,
      experienceFromLinkedIn.companyId
    );

    if (companyId) {
      set.companyId = companyId;
      set.companyName = null;
    } else {
      set.companyId = null;
      set.companyName = experienceFromLinkedIn.companyName;
    }
  }

  if (existingExperience.title !== experienceFromLinkedIn.position) {
    set.title = experienceFromLinkedIn.position;
  }

  if (existingExperience.description !== experienceFromLinkedIn.description) {
    set.description = experienceFromLinkedIn.description;
  }

  const employmentType =
    EMPLOYMENT_TYPE_MAP[experienceFromLinkedIn.employmentType || ''];

  if (employmentType && existingExperience.employmentType !== employmentType) {
    set.employmentType = employmentType;
  }

  if (experienceFromLinkedIn.location) {
    const location = await getMostRelevantLocation(
      experienceFromLinkedIn.location
    );

    if (location) {
      if (
        existingExperience.locationCity !== location.city ||
        existingExperience.locationState !== location.state
      ) {
        set.locationCity = location.city;
        set.locationState = location.state;
      }
    }
  }

  const locationType =
    LOCATION_TYPE_MAP[experienceFromLinkedIn.workplaceType || ''];

  if (locationType && existingExperience.locationType !== locationType) {
    set.locationType = locationType;
  }

  const startDate = run(() => {
    const startMonth = experienceFromLinkedIn.startDate?.month;
    const startYear = experienceFromLinkedIn.startDate?.year;

    if (startYear && startMonth) {
      // The `startMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${startYear}-${MONTH_MAP[startMonth]}-01`;
    } else if (startYear) {
      // If there is no `startMonth`, we'll default to January since that's
      // when most companies start their fiscal year.
      return `${startYear}-01-01`;
    }

    return undefined;
  });

  if (startDate && existingExperience.startDate !== startDate) {
    set.startDate = startDate;
  }

  const endDate = run(() => {
    const endMonth = experienceFromLinkedIn.endDate?.month;
    const endYear = experienceFromLinkedIn.endDate?.year;

    if (endMonth && endYear) {
      // The `endMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${endYear}-${MONTH_MAP[endMonth]}-01`;
    } else if (endYear) {
      // If there is no `endMonth`, we'll default to December since that's
      // when most companies end their fiscal year.
      return `${endYear}-12-01`;
    }

    return undefined;
  });

  if (endDate && existingExperience.endDate !== endDate) {
    set.endDate = endDate;
  }

  if (!Object.keys(set).length) {
    return;
  }

  return trx
    .updateTable('workExperiences')
    .set(set)
    .where('id', '=', existingExperience.id)
    .execute();
}

/**
 * Finds the most relevant location using the Google Places API. This function
 * uses the autocomplete endpoint to find a list of matched cities. We choose
 * the top match and then use the details endpoint to get the city, state and
 * coordinates.
 *
 * @param location - Location name to search for.
 * @returns Promise resolving to the most relevant matching location, if found.
 */
async function getMostRelevantLocation(location: string | null | undefined) {
  if (!location) {
    return null;
  }

  return withCache(
    `${getMostRelevantLocation.name}:${location}`,
    ONE_WEEK_IN_SECONDS * 4,
    async function fn() {
      const cities = await getAutocompletedCities(location);

      if (!cities || !cities.length) {
        return null;
      }

      const details = await getCityDetails(cities[0].id);

      if (details && details.city && details.state) {
        return details;
      }

      return null;
    }
  );
}
