import { sql, type Transaction, type Updateable } from 'kysely';
import { z } from 'zod';

import { type DB, db, point } from '@oyster/db';
import { type Major } from '@oyster/types';
import { id, run, splitArray } from '@oyster/utils';

import { track } from '@/infrastructure/mixpanel';
import { cache } from '@/infrastructure/redis';
import { runActor } from '@/modules/apify';
import { checkMostRecentEducation } from '@/modules/education/use-cases/check-most-recent-education';
import { saveSchoolIfNecessary } from '@/modules/education/use-cases/save-school-if-necessary';
import {
  type EmploymentType,
  type LocationType,
} from '@/modules/employment/employment.types';
import { saveCompanyIfNecessary } from '@/modules/employment/use-cases/save-company-if-necessary';
import { getMostRelevantLocation } from '@/modules/location/location';

const LinkedInDate = z.object({
  month: z.string().nullish(), // Formatted as a 3-letter abbreviation.
  year: z.number().nullish(),
});

const LinkedInProfile = z.object({
  element: z.object({
    education: z.array(
      z.object({
        degree: z.string().nullish(),
        description: z.string().nullish(),
        endDate: LinkedInDate.nullish(),
        fieldOfStudy: z.string().nullish(),
        schoolName: z.string(),
        schoolLinkedinUrl: z.string().url(),
        startDate: LinkedInDate.nullish(),
      })
    ),
    experience: z.array(
      z
        .object({
          companyId: z.string().nullish(),
          companyName: z.string(),
          description: z.string().nullish(),
          employmentType: z.string().nullish(),
          endDate: LinkedInDate.nullish(),
          location: z
            .string()
            .nullish()
            .transform((value) => {
              return value
                ? value
                    .replace('Metropolitan Area', '')
                    .replace('Metropolitan Region', '')
                    .replace('Area', '')
                    .replace('Greater', '')
                    .replace('San Francisco Bay', 'San Francisco')
                    .trim()
                : null;
            }),
          position: z.string(),
          startDate: LinkedInDate.nullish(),
          workplaceType: z.string().nullish(),
        })
        .transform((experience) => {
          // These are some weird bugs in the Apify scraper that we can
          // work around by manually setting the location and workplace type.

          if (experience.location === 'Earth') {
            experience.location = null;
          }

          const location = experience.location as string;
          const workplaceType = experience.workplaceType as string;

          let locationIsWorkplaceType = false;
          let workplaceTypeIsLocation = false;

          if (
            location === 'Remote' ||
            location === 'Hybrid' ||
            location === 'On-site'
          ) {
            locationIsWorkplaceType = true;
          }

          if (
            experience.workplaceType &&
            experience.workplaceType !== 'Hybrid' &&
            experience.workplaceType !== 'Remote' &&
            experience.workplaceType !== 'On-site'
          ) {
            workplaceTypeIsLocation = true;
          }

          if (locationIsWorkplaceType && workplaceTypeIsLocation) {
            experience.location = workplaceType;
            experience.workplaceType = location;
          } else if (locationIsWorkplaceType) {
            experience.workplaceType = location;
            experience.location = null;
          } else if (workplaceTypeIsLocation) {
            experience.location = workplaceType;
            experience.workplaceType = null;
          }

          if (
            !experience.employmentType &&
            experience.position.includes('Intern')
          ) {
            experience.employmentType = 'Internship';
          }

          return experience;
        })
    ),
    headline: z.string().nullish(),
    location: z.object({
      parsed: z.object({
        text: z
          .string()
          .nullish()
          .transform((value) => {
            return value
              ? value
                  .replace('Metropolitan Area', '')
                  .replace('Metropolitan Region', '')
                  .replace('Area', '')
                  .replace('Greater', '')
                  .trim()
              : null;
          }),
      }),
    }),
    openToWork: z.boolean().nullish(),
    photo: z.string().url().nullish(),
  }),
  originalQuery: z.object({
    url: z.string(),
  }),
});

const LinkedInFailure = z.object({
  element: z.null(),
  originalQuery: z.object({ url: z.string() }),
});

type LinkedInProfile = z.infer<typeof LinkedInProfile>;

type LinkedInFailure = z.infer<typeof LinkedInFailure>;

type LinkedInEducation = z.infer<
  typeof LinkedInProfile
>['element']['education'][number];

type LinkedInExperience = z.infer<
  typeof LinkedInProfile
>['element']['experience'][number];

type SyncLinkedInProfilesOptions = {
  limit?: number;
  memberIds?: string[];
};

/**
 * Syncs a members' LinkedIn profiles (work, education, etc.) with their
 * respective database records. This is a complex process which executes the
 * following steps:
 * 1. Fetches all members, educations and experiences from the database.
 * 2. We store the results in memory (maps) for faster access.
 * 3. We filter through the batch and see if there are any that we already
 *    have in the cache. If so, we'll add them to the results array and remove
 *    them from the batch so we don't have to scrape them again.
 * 4. We scrape the profiles that we don't have in the cache.
 * 5. We combine the cached profiles with the new profiles so that we can use
 *    profiles to update the database.
 * 6. We check for differences between the scraped profiles and the database
 *    records and update the database accordingly.
 * 7. We check for the most recent education and update the database if
 *    necessary.
 *
 * @param options.memberIds - Optional array of member IDs to sync. If not
 *   provided, all members with a LinkedIn URL will be synced.
 * @param options.limit - Optional limit on the number of members to sync.
 */
export async function syncLinkedInProfiles(
  options?: SyncLinkedInProfilesOptions
) {
  const members = await db.transaction().execute(async (trx) => {
    return getAllMembers(trx, options);
  });

  const memberIds = members.map((member) => member.id);

  const [educations, experiences] = await db
    .transaction()
    .execute(async (trx) => {
      return Promise.all([
        getAllEducations(trx, memberIds),
        getAllExperiences(trx, memberIds),
      ]);
    });

  console.log(`Fetched ${members.length} members.`);
  console.log(`Fetched ${educations.length} educations.`);
  console.log(`Fetched ${experiences.length} experiences.`);

  // In order to fetch all the database records the most efficiently, we
  // need to group them by member ID in memory after the database query. The
  // alternative is to fetch each of the associated records for each member
  // in a loop which would be much slower.

  const memberMap: Record<string, Member> = {};
  const educationMap: Record<string, Education[]> = {};
  const experienceMap: Record<string, Experience[]> = {};

  members.forEach((member) => {
    memberMap[member.id] = member;
    educationMap[member.id] = [];
    experienceMap[member.id] = [];
  });

  educations.forEach((education) => {
    educationMap[education.studentId].push(education);
  });

  experiences.forEach((experience) => {
    experienceMap[experience.studentId].push(experience);
  });

  const batches = splitArray(members, 100);

  console.log(
    `Splitting ${members.length} members into ${batches.length} batches.`
  );

  for (let i = 0; i < batches.length; i++) {
    console.log(`Processing batch ${i + 1} of ${batches.length}.`);

    const profilesToScrape: string[] = [];
    const cachedProfiles: LinkedInProfile[] = [];

    // We need to filter through the batch and see if there are any that we
    // already have in the cache. If so, we'll add them to the results array
    // and remove them from the batch so we don't have to scrape them again.
    await Promise.all(
      batches[i].map(async (member) => {
        const profile = await cache.get<LinkedInProfile>(
          `harvestapi~linkedin-profile-scraper:${member.linkedInUrl}`
        );

        if (profile) {
          cachedProfiles.push(profile);
        } else {
          const url = new URL(member.linkedInUrl!);

          // We need a way to reference the member in the cache after we
          // scrape the profile so we set this query parameter then we can
          // use it to get the member from the cache.
          url.searchParams.set('id', member.id);

          profilesToScrape.push(url.toString());
        }
      })
    );

    console.log(`Found ${cachedProfiles.length} cached profiles.`);
    console.log(`Attempting to scrape ${profilesToScrape.length} profiles.`);

    // This is the most expensive part of the process and what actually is
    // doing the scraping.
    const newProfiles = await runActor({
      actorId: 'harvestapi~linkedin-profile-scraper',
      body: { urls: profilesToScrape },
      schema: z.array(z.union([LinkedInProfile, LinkedInFailure])),
    });

    const failedProfiles: LinkedInFailure[] = [];
    const scrapedProfiles: LinkedInProfile[] = [];

    newProfiles.forEach((profile) => {
      if (!profile.element) {
        // We want to still keep track of the profiles that failed the scraping
        // process so that we can probe manually after.
        failedProfiles.push(profile);
      } else {
        scrapedProfiles.push(profile);
      }
    });

    console.log(`Successfully scraped ${scrapedProfiles.length} profiles.`);

    if (failedProfiles.length) {
      console.log(`Failed to scrape ${failedProfiles.length} profiles.`);

      await db.transaction().execute(async (trx) => {
        await Promise.all(
          failedProfiles.map(async (profile) => {
            const url = new URL(profile.originalQuery.url);

            const memberId = url.searchParams.get('id') as string;

            url.search = '';

            await trx
              .updateTable('students')
              .set({ linkedinSyncedAt: new Date(), updatedAt: new Date() })
              .where('id', '=', memberId)
              .execute();

            await cache.set(
              `harvestapi~linkedin-profile-scraper:${url}`,
              profile,
              60 * 60 * 24 * 30
            );

            console.log(`Failed to scrape ${url}.`);
          })
        );
      });
    }

    await Promise.all(
      [...cachedProfiles, ...scrapedProfiles].map(async (profile) => {
        const url = new URL(profile.originalQuery.url);

        const memberId = url.searchParams.get('id') as string;

        url.search = '';

        await cache.set(
          `harvestapi~linkedin-profile-scraper:${url}`,
          profile,
          60 * 60 * 24 * 30
        );

        const member = memberMap[memberId];
        const educations = educationMap[member.id];
        const experiences = experienceMap[member.id];

        let educationCreates = 0;
        let educationUpdates = 0;
        let experienceCreates = 0;
        let experienceUpdates = 0;
        let memberUpdates = 0;

        try {
          await db.transaction().execute(async (trx) => {
            await Promise.all([
              run(async () => {
                const result = await checkMember({ member, profile, trx });

                if (result && !!result.numUpdatedRows) {
                  memberUpdates += 1;
                }
              }),

              ...profile.element.education.map(
                async (educationFromLinkedIn) => {
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
                }
              ),

              ...profile.element.experience.map(
                async (experienceFromLinkedIn) => {
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
                }
              ),
            ]);
          });

          if (!!educationCreates || !!educationUpdates) {
            checkMostRecentEducation(member.id);
          }

          track({
            event: 'LinkedIn Synced',
            properties: {
              '# of Education Creates': educationCreates,
              '# of Education Updates': educationUpdates,
              '# of Member Updates': memberUpdates,
              '# of Work Experience Creates': experienceCreates,
              '# of Work Experience Updates': experienceUpdates,
            },
            user: member.id,
          });

          console.log(
            `Synced member ${member.id} with ${educationCreates + educationUpdates + experienceCreates + experienceUpdates + memberUpdates} updates.`
          );
        } catch (error) {
          console.error(error);
        }
      })
    );
  }
}

type Member = Awaited<ReturnType<typeof getAllMembers>>[number];

async function getAllMembers(
  trx: Transaction<DB>,
  options?: SyncLinkedInProfilesOptions
) {
  return trx
    .selectFrom('students')
    .leftJoin('workExperiences', 'workExperiences.studentId', 'students.id')
    .leftJoin('educations', 'educations.studentId', 'students.id')
    .select([
      'students.currentLocation',
      'students.headline',
      'students.id',
      'students.linkedInUrl',
      'students.profilePicture',
      ({ fn }) => fn.count('workExperiences.id').as('workExperienceCount'),
      ({ fn }) => fn.count('educations.id').as('educationCount'),
    ])
    .$if(!!options?.memberIds?.length, (qb) => {
      return qb.where('students.id', 'in', options!.memberIds!);
    })
    .where('students.linkedInUrl', 'is not', null)
    .groupBy('students.id')
    .orderBy('workExperienceCount', 'asc')
    .orderBy('educationCount', 'asc')
    .orderBy('students.linkedinSyncedAt', sql`asc nulls first`)
    .orderBy('acceptedAt', 'asc')
    .orderBy('students.id', 'asc')
    .$if(!!options?.limit, (qb) => {
      return qb.limit(options!.limit!);
    })
    .execute();
}

type Education = Awaited<ReturnType<typeof getAllEducations>>[number];

async function getAllEducations(trx: Transaction<DB>, memberIds: string[]) {
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
    .where('educations.studentId', 'in', memberIds!)
    .where('educations.deletedAt', 'is', null)
    .orderBy('educations.endDate', 'desc')
    .orderBy('educations.startDate', 'desc')
    .execute();
}

type Experience = Awaited<ReturnType<typeof getAllExperiences>>[number];

async function getAllExperiences(trx: Transaction<DB>, memberIds: string[]) {
  return trx
    .selectFrom('workExperiences')
    .leftJoin('companies', 'companies.id', 'workExperiences.companyId')
    .select([
      'companies.linkedinId',
      'workExperiences.description',
      'workExperiences.employmentType',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationCountry',
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
    .where('workExperiences.studentId', 'in', memberIds!)
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
      return getMostRelevantLocation(locationFromLinkedIn, 'geocode');
    }
  });

  return trx
    .updateTable('students')
    .set({
      ...(!member.headline && {
        headline: profile.element.headline,
      }),
      ...((!member.headline || !member.profilePicture) &&
        !profile.element.openToWork && {
          profilePicture: profile.element.photo,
        }),
      ...(!!updatedLocation && {
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
  // pre-college.
  if (!educationFromLinkedIn.degree) {
    return;
  }

  // Sometimes the scraper will return both the degree and the field of study
  // in one field, so we'll check both.
  const fieldOfStudy =
    getFieldOfStudy(educationFromLinkedIn.fieldOfStudy || '') ||
    getFieldOfStudy(educationFromLinkedIn.degree || '') ||
    getFieldOfStudy(educationFromLinkedIn.description || '');

  // If there is no field of study, it likely means that the education was
  // part of a general education program.
  if (!educationFromLinkedIn.fieldOfStudy && !fieldOfStudy) {
    return;
  }

  const degreeType =
    getDegreeType(educationFromLinkedIn.degree) ||
    getDegreeType(educationFromLinkedIn.description || '');

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

  const startMonth = educationFromLinkedIn.startDate?.month;
  const startYear = educationFromLinkedIn.startDate?.year;
  const endMonth = educationFromLinkedIn.endDate?.month;
  const endYear = educationFromLinkedIn.endDate?.year;

  const startDate = run(() => {
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
    const set: Updateable<DB['educations']> = {};

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

    if (endDate && existingEducation.endDate !== endDate) {
      set.endDate = endDate;
    }

    if (startDate && existingEducation.startDate !== startDate) {
      set.startDate = startDate;
    }

    if (!Object.keys(set).length) {
      return;
    }

    set.linkedinSyncedAt = new Date();
    set.updatedAt = new Date();

    return trx
      .updateTable('educations')
      .set(set)
      .where('id', '=', existingEducation.id)
      .executeTakeFirst();
  }

  const schoolId = await saveSchoolIfNecessary(trx, linkedinId);

  return trx
    .insertInto('educations')
    .values({
      createdAt: new Date(),
      degreeType,
      endDate,
      id: id(),
      linkedinSyncedAt: new Date(),
      startDate,
      studentId: memberId,
      updatedAt: new Date(),

      ...(schoolId
        ? { schoolId }
        : { otherSchool: educationFromLinkedIn.schoolName }),

      ...(fieldOfStudy
        ? { major: fieldOfStudy }
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

  if (
    value.includes('bachelor') ||
    value.includes('undergraduate') ||
    degree.includes('BS')
  ) {
    return 'bachelors';
  }

  if (value.includes('master') || degree.includes('MS')) {
    return 'masters';
  }

  if (value.includes('doctor') || degree.includes('PhD')) {
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
  const value = fieldOfStudy.toLowerCase();

  if (value.includes('computer science')) {
    return 'computer_science';
  }

  if (
    value.includes('computer engineering') ||
    value.includes('electrical engineering')
  ) {
    return 'electrical_or_computer_engineering';
  }

  if (value.includes('data science') || value.includes('data analytics')) {
    return 'data_science';
  }

  if (value.includes('information science')) {
    return 'information_science';
  }

  if (value.includes('information technology')) {
    return 'information_technology';
  }

  if (value.includes('software engineering')) {
    return 'software_engineering';
  }

  if (value.includes('cybersecurity')) {
    return 'cybersecurity';
  }

  return null;
}

// Work Experience

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

  // This is a special case for the "ColorStack" company...a lot of members
  // put "Fellow" on their work experience with ColorStack, but we don't want
  // that to sync to our database since this is already in ColorStack.
  if (
    experienceFromLinkedIn.companyId === '53416834' &&
    experienceFromLinkedIn.employmentType !== 'Full-time'
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

const EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType> = {
  Apprenticeship: 'apprenticeship',
  Contract: 'contract',
  Freelance: 'freelance',
  'Full-time': 'full_time',
  Internship: 'internship',
  'Part-time': 'part_time',
  Temporary: 'part_time',
};

const LOCATION_TYPE_MAP: Record<string, LocationType> = {
  Hybrid: 'hybrid',
  'On-site': 'in_person',
  Remote: 'remote',
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
  const startMonth = experienceFromLinkedIn.startDate?.month;
  const startYear = experienceFromLinkedIn.startDate?.year;
  const endMonth = experienceFromLinkedIn.endDate?.month;
  const endYear = experienceFromLinkedIn.endDate?.year;

  const startDate = run(() => {
    if (startYear && startMonth) {
      // The `startMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${startYear}-${MONTH_MAP[startMonth]}-01`;
    }

    return `${startYear}-01-01`;
  });

  const endDate = run(() => {
    if (endMonth && endYear) {
      // The `endMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${endYear}-${MONTH_MAP[endMonth]}-01`;
    } else if (endYear && startYear === endYear && !startMonth) {
      return `${endYear}-12-01`;
    } else if (endYear) {
      // If there is no `endMonth`, we'll default to December since that's
      // when most companies end their fiscal year.
      return `${endYear}-01-01`;
    }

    return undefined;
  });

  const [companyId, location] = await Promise.all([
    saveCompanyIfNecessary(trx, experienceFromLinkedIn.companyId),
    getMostRelevantLocation(experienceFromLinkedIn.location, 'geocode'),
  ]);

  return trx
    .insertInto('workExperiences')
    .values({
      createdAt: new Date(),
      description: experienceFromLinkedIn.description,
      endDate,
      id: id(),
      linkedinSyncedAt: new Date(),
      startDate,
      studentId: memberId,
      title: experienceFromLinkedIn.position,
      updatedAt: new Date(),

      ...(companyId
        ? { companyId }
        : { companyName: experienceFromLinkedIn.companyName }),

      ...(!!location?.city && {
        locationCity: location.city,
        locationCountry: location.country,
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
  const set: Updateable<DB['workExperiences']> = {};

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
      experienceFromLinkedIn.location,
      'geocode'
    );

    if (location?.city) {
      if (
        existingExperience.locationCity !== location.city ||
        existingExperience.locationState !== location.state ||
        existingExperience.locationCountry !== location.country
      ) {
        set.locationCity = location.city;
        set.locationState = location.state;
        set.locationCountry = location.country;
      }
    }
  }

  const locationType =
    LOCATION_TYPE_MAP[experienceFromLinkedIn.workplaceType || ''];

  if (locationType && existingExperience.locationType !== locationType) {
    set.locationType = locationType;
  }

  const startMonth = experienceFromLinkedIn.startDate?.month;
  const startYear = experienceFromLinkedIn.startDate?.year;
  const endMonth = experienceFromLinkedIn.endDate?.month;
  const endYear = experienceFromLinkedIn.endDate?.year;

  const startDate = run(() => {
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
    if (endMonth && endYear) {
      // The `endMonth` is formatted as an abbreviation of the month, so
      // we need to convert it to a 2-digit number (ie: `Jan` -> `01`).
      return `${endYear}-${MONTH_MAP[endMonth]}-01`;
    } else if (endYear && startYear === endYear && !startMonth) {
      return `${endYear}-12-01`;
    } else if (endYear) {
      return `${endYear}-01-01`;
    }

    return undefined;
  });

  if (endDate && existingExperience.endDate !== endDate) {
    set.endDate = endDate;
  }

  if (!Object.keys(set).length) {
    return;
  }

  set.linkedinSyncedAt = new Date();
  set.updatedAt = new Date();

  return trx
    .updateTable('workExperiences')
    .set(set)
    .where('id', '=', existingExperience.id)
    .execute();
}
