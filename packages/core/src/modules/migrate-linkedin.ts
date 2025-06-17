import { sql, type Transaction } from 'kysely';
import { z } from 'zod';

import { type DB, db, point } from '@oyster/db';
import { id, run, splitArray } from '@oyster/utils';

import { cache, ONE_WEEK_IN_SECONDS } from '@/infrastructure/redis';
import { runActor } from '@/modules/apify';
import { saveSchoolIfNecessary } from '@/modules/education/use-cases/save-school-if-necessary';
import {
  EmploymentType,
  LocationType,
} from '@/modules/employment/employment.types';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import {
  type CityDetails,
  getAutocompletedCities,
  getCityDetails,
} from '@/modules/location/location';

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

const LOCATION_TYPE_MAP: Record<string, string> = {
  Hybrid: LocationType.HYBRID,
  'On-site': LocationType.IN_PERSON,
  Remote: LocationType.REMOTE,
};

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  Apprenticeship: EmploymentType.APPRENTICESHIP,
  Contract: EmploymentType.CONTRACT,
  Freelance: EmploymentType.FREELANCE,
  'Full-time': EmploymentType.FULL_TIME,
  Internship: EmploymentType.INTERNSHIP,
  'Part-time': EmploymentType.PART_TIME,
};

const LinkedInDate = z.object({
  month: z.string().nullish(),
  text: z.string(),
  year: z.number().nullish(),
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

export async function migrateLinkedin() {
  const [members, educations, workExperiences] = await db
    .transaction()
    .execute(async (trx) => {
      return Promise.all([
        getAllMembers(trx),
        getAllEducationHistories(trx),
        getAllWorkHistories(trx),
      ]);
    });

  type Member = (typeof members)[number];
  type Education = (typeof educations)[number];
  type WorkExperience = (typeof workExperiences)[number];

  const memberMap: Record<string, Member> = {};
  const educationMap: Record<string, Education[]> = {};
  const workExperienceMap: Record<string, WorkExperience[]> = {};

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

  workExperiences.forEach((workExperience) => {
    if (workExperienceMap[workExperience.studentId]) {
      workExperienceMap[workExperience.studentId].push(workExperience);
    } else {
      workExperienceMap[workExperience.studentId] = [workExperience];
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
        const workExperiences = workExperienceMap[member.id];

        await db.transaction().execute(async (trx) => {
          await Promise.all([
            checkMember({ member, profile, trx }),

            ...profile.education.map(async (educationFromLinkedIn) => {
              return checkEducation({
                educationFromLinkedIn,
                educations,
                memberId: member.id,
                trx,
              });
            }),
            ...profile.experience.map(async (experienceFromLinkedIn) => {
              return checkWorkExperience({
                experienceFromLinkedIn,
                experiences: workExperiences,
                memberId: member.id,
                trx,
              });
            }),
          ]);
        });
      })
    );
  }
}

type CheckMemberInput = {
  member: Awaited<ReturnType<typeof getAllMembers>>[number];
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

  await trx
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
    .execute();
}

type CheckEducationInput = {
  educationFromLinkedIn: LinkedInProfile['education'][number];
  educations: Awaited<ReturnType<typeof getAllEducationHistories>>;
  memberId: string;
  trx: Transaction<DB>;
};

async function checkEducation({
  educationFromLinkedIn,
  educations,
  memberId,
  trx,
}: CheckEducationInput) {
  if (!educationFromLinkedIn.degree || !educationFromLinkedIn.fieldOfStudy) {
    return;
  }

  const url = new URL(educationFromLinkedIn.schoolLinkedinUrl);

  const linkedinId = url.pathname.split('/').filter(Boolean)[1];

  if (!linkedinId) {
    return;
  }

  const degreeType = getDegreeType(educationFromLinkedIn.degree);

  const existingEducation = educations.find((education) => {
    return (
      (education.linkedinId === linkedinId ||
        education.school.includes(educationFromLinkedIn.schoolName) ||
        educationFromLinkedIn.schoolName.includes(education.school)) &&
      education.degreeType === degreeType
    );
  });

  const startDate = run(() => {
    const startMonth = educationFromLinkedIn.startDate?.month;
    const startYear = educationFromLinkedIn.startDate?.year;

    if (startMonth && startYear) {
      return `${startYear}-${MONTH_MAP[startMonth]}-01`;
    } else if (startYear) {
      return `${startYear}-08-01`;
    }

    return undefined;
  });

  const endDate = run(() => {
    const endMonth = educationFromLinkedIn.endDate?.month;
    const endYear = educationFromLinkedIn.endDate?.year;

    if (endMonth && endYear) {
      return `${endYear}-${MONTH_MAP[endMonth]}-01`;
    } else if (endYear) {
      return `${endYear}-05-01`;
    }

    return undefined;
  });

  if (existingEducation) {
    let update = false;

    if (
      existingEducation.linkedinId !== linkedinId ||
      (endDate !== existingEducation.endDate &&
        educationFromLinkedIn.endDate?.month &&
        educationFromLinkedIn.endDate?.year) ||
      (startDate !== existingEducation.startDate &&
        educationFromLinkedIn.startDate?.month &&
        educationFromLinkedIn.startDate?.year)
    ) {
      update = true;
    }

    if (!update) {
      return;
    }

    const schoolId = await saveSchoolIfNecessary(trx, linkedinId);

    return trx
      .updateTable('educations')
      .set({
        ...(schoolId
          ? { otherSchool: null, schoolId }
          : { otherSchool: educationFromLinkedIn.schoolName, schoolId: null }),

        endDate,
        startDate,
        updatedAt: new Date(),
      })
      .where('id', '=', existingEducation.id)
      .execute();
  }

  const schoolId = await saveSchoolIfNecessary(trx, linkedinId);

  const major = getFieldOfStudy(educationFromLinkedIn.fieldOfStudy);

  await trx
    .insertInto('educations')
    .values({
      ...(schoolId
        ? { otherSchool: null, schoolId }
        : { otherSchool: educationFromLinkedIn.schoolName, schoolId: null }),

      ...(major === 'other'
        ? { major, otherMajor: educationFromLinkedIn.fieldOfStudy }
        : { major, otherMajor: null }),

      createdAt: new Date(),
      degreeType,
      endDate,
      id: id(),
      startDate,
      studentId: memberId,
      updatedAt: new Date(),
    })
    .execute();
}

type CheckWorkExperienceInput = {
  experienceFromLinkedIn: LinkedInProfile['experience'][number];
  experiences: Awaited<ReturnType<typeof getAllWorkHistories>>;
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
    await updateWorkExperience({
      experienceFromLinkedIn,
      id: existingExperience.id,
      trx,
    });
  } else {
    await createWorkExperience({
      experienceFromLinkedIn,
      memberId,
      trx,
    });
  }
}

function doesExperienceMatch(
  experienceFromLinkedIn: LinkedInProfile['experience'][number],
  experience: Awaited<ReturnType<typeof getAllWorkHistories>>[number]
): boolean {
  // todo: need to allow close matches, ie:
  // cornell university vs. cornell university engineering dept.
  if (
    experience.linkedinId !== experienceFromLinkedIn.companyId &&
    experience.company &&
    !experience.company.includes(experienceFromLinkedIn.companyName) &&
    !experienceFromLinkedIn.companyName.includes(experience.company)
  ) {
    return false;
  }

  let score = 0;

  if (experienceFromLinkedIn.position === experience.title) {
    score += 2;
  }

  if (
    experience.startYear &&
    experienceFromLinkedIn.startDate?.year &&
    parseInt(experience.startYear) === experienceFromLinkedIn.startDate!.year
  ) {
    score++;
  }

  if (
    experience.startMonth &&
    experienceFromLinkedIn.startDate?.month &&
    experience.startMonth === MONTH_MAP[experienceFromLinkedIn.startDate.month]
  ) {
    score++;
  }

  if (
    experience.endYear &&
    experienceFromLinkedIn.endDate?.year &&
    parseInt(experience.endYear) === experienceFromLinkedIn.endDate!.year
  ) {
    score++;
  }

  if (
    experience.endMonth &&
    experienceFromLinkedIn.endDate?.month &&
    experience.endMonth === MONTH_MAP[experienceFromLinkedIn.endDate.month]
  ) {
    score++;
  }

  // if there is a month present and it's not within +/- 1 month
  // then return false...otherwise return true

  // another option is we calculate like a "confidence" score
  // or some amount of things have to be true...

  // delta of +/- 1 month start date error?

  return score >= 3;
}

type CreateWorkExperienceInput = {
  experienceFromLinkedIn: LinkedInProfile['experience'][number];
  memberId: string;
  trx: Transaction<DB>;
};

async function createWorkExperience({
  experienceFromLinkedIn,
  memberId,
  trx,
}: CreateWorkExperienceInput) {
  let startDate = '';
  let endDate = null;

  const { month: startMonth, year: startYear } =
    experienceFromLinkedIn.startDate || {};

  const { month: endMonth, year: endYear } =
    experienceFromLinkedIn.endDate || {};

  if (startMonth && startYear) {
    startDate = `${startYear}-${MONTH_MAP[startMonth]}-01`;
  } else if (startYear) {
    startDate = `${startYear}-01-01`;
  }

  if (endMonth && endYear) {
    endDate = `${endYear}-${MONTH_MAP[endMonth]}-01`;
  } else if (endYear) {
    endDate = `${endYear}-12-01`;
  }

  const [companyId, location] = await Promise.all([
    saveCompanyIfNecessary(trx, experienceFromLinkedIn.companyId),
    getMostRelevantLocation(experienceFromLinkedIn.location || ''),
  ]);

  await trx
    .insertInto('workExperiences')
    .values({
      ...(location && {
        locationCity: location.city,
        locationState: location.state,
      }),
      ...(experienceFromLinkedIn.workplaceType && {
        locationType: LOCATION_TYPE_MAP[experienceFromLinkedIn.workplaceType],
      }),
      companyId,
      description: experienceFromLinkedIn.description,
      employmentType:
        EMPLOYMENT_TYPE_MAP[experienceFromLinkedIn.employmentType || ''] ||
        EmploymentType.FULL_TIME, // make this nullable
      endDate,
      id: id(),
      source: 'linkedin',
      startDate,
      studentId: memberId,
      title: experienceFromLinkedIn.position,
    })
    .execute();
}

type UpdateWorkExperienceInput = {
  experienceFromLinkedIn: LinkedInProfile['experience'][number];
  id: string;
  trx: Transaction<DB>;
};

async function updateWorkExperience({
  experienceFromLinkedIn,
  id,
  trx,
}: UpdateWorkExperienceInput) {
  await trx
    .updateTable('workExperiences')
    .set({
      // ...(experienceFromLinkedIn.location && {
      //   locationCity: experienceFromLinkedIn.location,
      // }),
      // ...(experienceFromLinkedIn.workplaceType && {
      //   locationType:
      //     LOCATION_TYPE_MAP[experienceFromLinkedIn.workplaceType],
      // }),
      // companyId: experienceFromLinkedIn.companyId,
      // description: experienceFromLinkedIn.description,
      // employmentType:
      //   EMPLOYMENT_TYPE_MAP[
      //     experienceFromLinkedIn.employmentType || ''
      //   ] || EmploymentType.FULL_TIME, // make this nullable
      // endDate: experienceFromLinkedIn.endDate,
      // startDate: experienceFromLinkedIn.startDate,
      // title: experienceFromLinkedIn.position,
    })
    .where('id', '=', id)
    .execute();
}

async function getAllMembers(trx: Transaction<DB>) {
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
    .where('students.linkedInUrl', 'is not', null)
    .where('students.linkedinSyncedAt', 'is', null)
    .groupBy('students.id')
    .orderBy('workExperienceCount', 'asc')
    .orderBy('students.linkedinSyncedAt', sql`asc nulls first`)
    .orderBy('acceptedAt', 'asc')
    .execute();
}

async function getAllEducationHistories(trx: Transaction<DB>) {
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
          .coalesce('schools.name', 'educations.otherSchool')
          .$castTo<string>()
          .as('school');
      },
    ])
    .where('educations.deletedAt', 'is', null)
    .orderBy('educations.startDate', 'desc')
    .orderBy('educations.endDate', 'desc')
    .execute();
}

async function getAllWorkHistories(trx: Transaction<DB>) {
  return trx
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'companies.linkedinId',
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
        return sql<string>`to_char(${ref('startDate')}, 'MM')`.as('startMonth');
      },
      ({ ref }) => {
        return sql<string>`to_char(${ref('startDate')}, 'YYYY')`.as(
          'startYear'
        );
      },
      ({ fn }) => {
        return fn
          .coalesce('companies.name', 'workExperiences.companyName')
          .as('company');
      },
    ])
    .where('workExperiences.deletedAt', 'is', null)
    .orderBy('workExperiences.endDate', 'desc')
    .orderBy('workExperiences.startDate', 'desc')
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
async function getMostRelevantLocation(location: string | null) {
  if (!location) {
    return null;
  }

  const cachedLocation = await cache.get<CityDetails>(`location:${location}`);

  if (cachedLocation) {
    return cachedLocation;
  }

  const cities = await getAutocompletedCities(location);

  if (cities?.length) {
    const details = await getCityDetails(cities[0].id);

    if (details && details.city && details.state) {
      await cache.set(`location:${location}`, details, ONE_WEEK_IN_SECONDS * 4);

      return details;
    }
  }

  return null;
}

function getDegreeType(degree: string) {
  if (degree.includes('Bachelor')) {
    return 'bachelors';
  }

  if (degree.includes('Master')) {
    return 'masters';
  }

  if (degree.includes('Doctor')) {
    return 'doctoral';
  }

  if (degree.includes('Associate')) {
    return 'associate';
  }

  return 'certificate';
}

function getFieldOfStudy(fieldOfStudy: string) {
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

  return 'other';
}

function getLinkedInIdFromUrl(url: string) {
  return new URL(url).pathname.split('/').filter(Boolean)[1];
}
