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

const EMPLOYMENT_TYPE_MAP: Record<string, EmploymentType | null> = {
  Apprenticeship: 'apprenticeship',
  Contract: 'contract',
  Freelance: 'freelance',
  'Full-time': 'full_time',
  Internship: 'internship',
  'Part-time': 'part_time',
  Temporary: 'part_time',
};

const LOCATION_TYPE_MAP: Record<string, LocationType | null> = {
  Hybrid: 'hybrid',
  'On-site': 'in_person',
  Remote: 'remote',
};

const LinkedInDate = z.object({
  month: z.string().nullish(), // Formatted as a 3-letter abbreviation.
  year: z.number().nullish(),
});

const LinkedInProfile = z.object({
  element: z.object({
    education: z.array(
      z
        .object({
          degree: z.string().nullish(),
          description: z.string().nullish(),
          endDate: LinkedInDate.nullish(),
          fieldOfStudy: z.string().nullish(),
          schoolName: z.string(),
          schoolLinkedinUrl: z.string().url(),
          startDate: LinkedInDate.nullish(),
        })
        .transform((education) => {
          const degreeType =
            getDegreeType(education.degree || '') ||
            getDegreeType(education.fieldOfStudy || '') ||
            getDegreeType(education.description || '');

          // If there is no `degree` field, it likely means that the education
          // was pre-college.
          if (!degreeType) {
            return null;
          }

          const fieldOfStudy =
            getFieldOfStudy(education.fieldOfStudy || '') ||
            getFieldOfStudy(education.degree || '') ||
            getFieldOfStudy(education.description || '');

          // If we couldn't find the field of study anywhere and the actual
          // field was empty too, we'll skip.
          if (!education.fieldOfStudy && !fieldOfStudy) {
            return null;
          }

          const url = new URL(education.schoolLinkedinUrl);

          // Example: https://www.linkedin.com/company/123 -> 123
          // Example: https://www.linkedin.com/school/123 -> 123
          const linkedinId = url.pathname.split('/').filter(Boolean)[1];

          // If there is no ID, it likely means that the school is not
          // accredited so we will skip syncing it.
          if (!linkedinId) {
            return null;
          }

          const startYear = education.startDate?.year;
          const endYear = education.endDate?.year;

          // The months are formatted as an abbreviation of the month, so we
          // need to convert it to a 2-digit number (ie: `Jan` -> `01`).
          const startMonth = MONTH_MAP[education.startDate?.month || ''];
          const endMonth = MONTH_MAP[education.endDate?.month || ''];

          const startDate = run(() => {
            if (startYear && startMonth) {
              return `${startYear}-${startMonth}-01`;
            } else if (startYear) {
              // Default to August since that's when most schools start.
              return `${startYear}-08-01`;
            }

            return undefined;
          });

          const endDate = run(() => {
            if (endMonth && endYear) {
              return `${endYear}-${endMonth}-01`;
            } else if (endYear) {
              // Default to May since that's when most schools end.
              return `${endYear}-05-01`;
            }

            return undefined;
          });

          return {
            degreeType,
            fieldOfStudy,
            endDate,
            linkedinId,
            otherFieldOfStudy: education.fieldOfStudy,
            schoolName: education.schoolName,
            startDate,
          };
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
          // We're going to ignore any work experiences that don't have a company
          // ID or start date for now...this errs on the side of caution.
          if (
            !experience.companyId ||
            !experience.startDate ||
            !experience.startDate.year
          ) {
            return null;
          }

          // This is a special case for the "ColorStack" company...a lot of members
          // put "Fellow" on their work experience with ColorStack, but we don't want
          // that to sync to our database since this is already in ColorStack.
          if (
            experience.companyId === '53416834' &&
            experience.employmentType !== 'Full-time'
          ) {
            return null;
          }

          if (experience.location === 'Earth') {
            experience.location = null;
          }

          // These are some weird bugs in the Apify scraper that we can
          // work around by manually setting the location and workplace type.

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

          const startYear = experience.startDate?.year;
          const endYear = experience.endDate?.year;

          // The months are formatted as an abbreviation of the month, so we
          // need to convert it to a 2-digit number (ie: `Jan` -> `01`).
          const startMonth = MONTH_MAP[experience.startDate?.month || ''];
          const endMonth = MONTH_MAP[experience.endDate?.month || ''];

          const startDate = run(() => {
            if (startYear && startMonth) {
              return `${startYear}-${startMonth}-01`;
            }

            // Default to January since the fiscal year starts in January.
            return `${startYear}-01-01`;
          });

          const endDate = run(() => {
            if (endMonth && endYear) {
              return `${endYear}-${endMonth}-01`;
            } else if (endYear && startYear === endYear && !startMonth) {
              // This is a special case when the dates read something like:
              // "2024 - 2024"...we want that to be like "1 year".
              return `${endYear}-12-01`;
            } else if (endYear) {
              return `${endYear}-01-01`;
            }

            return undefined;
          });

          return {
            companyId: experience.companyId,
            companyName: experience.companyName,
            description: experience.description,
            employmentType:
              EMPLOYMENT_TYPE_MAP[experience.employmentType || ''],
            endDate,
            endMonth,
            endYear,
            location: experience.location,
            locationType: LOCATION_TYPE_MAP[experience.workplaceType || ''],
            position: experience.position,
            startDate,
            startMonth,
            startYear,
          };
        })
    ),
    headline: z.string().nullish(),
    location: z.object({
      parsed: z
        .object({
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
        })
        .nullish(),
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

type LinkedInEducation = NonNullable<
  z.infer<typeof LinkedInProfile>['element']['education'][number]
>;

type LinkedInExperience = NonNullable<
  z.infer<typeof LinkedInProfile>['element']['experience'][number]
>;

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
    const cachedProfiles: (LinkedInProfile | LinkedInFailure)[] = [];

    // We need to filter through the batch and see if there are any that we
    // already have in the cache. If so, we'll add them to the results array
    // and remove them from the batch so we don't have to scrape them again.
    await Promise.all(
      batches[i].map(async (member) => {
        const profile = await cache.get<LinkedInProfile | LinkedInFailure>(
          `harvestapi~linkedin-profile-scraper:v2:${member.linkedInUrl}`
        );

        if (profile) {
          const parsedProfile = z
            .union([LinkedInProfile, LinkedInFailure])
            .parse(profile);

          cachedProfiles.push(parsedProfile);
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
    const apifyResult = await runActor({
      actorId: 'harvestapi~linkedin-profile-scraper',
      body: { urls: profilesToScrape },
    });

    // We just need the bare minimum in order to cache the profiles, we're not
    // trying to parse the entire profile here. This ensures that we're not
    // too restrictive and forcing ourselves to re-scrape profiles that we
    // already have in the cache.
    const profilesToCache = z
      .object({ originalQuery: z.object({ url: z.string() }) })
      .passthrough()
      .array()
      .parse(apifyResult);

    await Promise.all(
      profilesToCache.map(async (profile) => {
        const url = new URL(profile.originalQuery.url);

        url.search = '';

        await cache.set(
          `harvestapi~linkedin-profile-scraper:v2:${url}`,
          profile,
          60 * 60 * 24 * 30
        );
      })
    );

    // Now that we've cached the profiles, we can parse the results and
    // actually get the full profile.
    const newProfiles = z
      .array(z.union([LinkedInProfile, LinkedInFailure]))
      .parse(apifyResult);

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

            console.log(`Failed to scrape ${url}.`);
          })
        );
      });
    }

    await Promise.all(
      [...cachedProfiles, ...scrapedProfiles].map(async (profile) => {
        if (!profile.element) {
          return;
        }

        const url = new URL(profile.originalQuery.url);

        const memberId = url.searchParams.get('id') as string;

        url.search = '';

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

              ...profile.element.education.map(async (education) => {
                if (!education) {
                  return;
                }

                const result = await checkEducation({
                  educations,
                  linkedInEducation: education,
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

              ...profile.element.experience.map(async (experience) => {
                if (!experience) {
                  return;
                }

                const result = await checkWorkExperience({
                  experiences,
                  linkedInExperience: experience,
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
    const locationFromLinkedIn = profile.element.location.parsed?.text;

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

type CheckEducationInput = {
  educations: Education[];
  linkedInEducation: LinkedInEducation;
  memberId: string;
  trx: Transaction<DB>;
};

async function checkEducation({
  educations,
  linkedInEducation,
  memberId,
  trx,
}: CheckEducationInput) {
  const existingEducation = educations.find((education) => {
    if (education.degreeType !== linkedInEducation.degreeType) {
      return false;
    }

    // Usually we would just check for the exact ID match, but sometimes a
    // member on LinkedIn will link to a different account (ie: Cornell
    // University vs. Cornell University Engineering). So we'll check for
    // a close match from the school name as well.
    return (
      education.linkedinId === linkedInEducation.linkedinId ||
      education.school.includes(linkedInEducation.schoolName) ||
      linkedInEducation.schoolName.includes(education.school)
    );
  });

  if (existingEducation) {
    const set: Updateable<DB['educations']> = {};

    if (existingEducation.linkedinId !== linkedInEducation.linkedinId) {
      const schoolId = await saveSchoolIfNecessary(
        trx,
        linkedInEducation.linkedinId
      );

      if (schoolId) {
        set.schoolId = schoolId;
        set.otherSchool = null;
      } else {
        set.otherSchool = linkedInEducation.schoolName;
        set.schoolId = null;
      }
    }

    if (
      linkedInEducation.endDate &&
      existingEducation.endDate !== linkedInEducation.endDate
    ) {
      set.endDate = linkedInEducation.endDate;
    }

    if (
      linkedInEducation.startDate &&
      existingEducation.startDate !== linkedInEducation.startDate
    ) {
      set.startDate = linkedInEducation.startDate;
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

  const schoolId = await saveSchoolIfNecessary(
    trx,
    linkedInEducation.linkedinId
  );

  return trx
    .insertInto('educations')
    .values({
      createdAt: new Date(),
      degreeType: linkedInEducation.degreeType,
      endDate: linkedInEducation.endDate,
      id: id(),
      linkedinSyncedAt: new Date(),
      startDate: linkedInEducation.startDate,
      studentId: memberId,
      updatedAt: new Date(),

      ...(schoolId
        ? { schoolId }
        : { otherSchool: linkedInEducation.schoolName }),

      ...(linkedInEducation.fieldOfStudy
        ? { major: linkedInEducation.fieldOfStudy }
        : { major: 'other', otherMajor: linkedInEducation.otherFieldOfStudy }),
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
    degree.includes('BA') ||
    degree.includes('BS') ||
    degree.includes('B.A') ||
    degree.includes('B.S')
  ) {
    return 'bachelors';
  }

  if (
    value.includes('master') ||
    degree.includes('MS') ||
    degree.includes('M.S')
  ) {
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
  experiences: Experience[];
  linkedInExperience: LinkedInExperience;
  memberId: string;
  trx: Transaction<DB>;
};

async function checkWorkExperience({
  experiences,
  linkedInExperience,
  memberId,
  trx,
}: CheckWorkExperienceInput) {
  const existingExperience = experiences.find((experience) => {
    return doesExperienceMatch(linkedInExperience, experience);
  });

  if (existingExperience) {
    return updateWorkExperience({
      existingExperience,
      linkedInExperience,
      trx,
    });
  }

  return createWorkExperience({
    linkedInExperience,
    memberId,
    trx,
  });
}

function doesExperienceMatch(
  linkedInExperience: LinkedInExperience,
  experience: Experience
): boolean {
  // We allow for close matches to happen here simply to reduce the amount of
  // false positives (would rather update something than create a duplicate).
  if (
    experience.linkedinId !== linkedInExperience.companyId &&
    !experience.company.includes(linkedInExperience.companyName) &&
    !linkedInExperience.companyName.includes(experience.company)
  ) {
    return false;
  }

  // Now, we'll implement a "confidence" score to determine if the new
  // experience is the same as the existing experience.

  let score = 0;

  // The position name is the most important factor so if it's an exact match
  // then we'll give it a score of 2.
  if (linkedInExperience.position === experience.title) {
    score += 2;
  }

  if (
    linkedInExperience.startYear &&
    linkedInExperience.startYear === parseInt(experience.startYear)
  ) {
    score++;
  }

  if (
    linkedInExperience.startMonth &&
    linkedInExperience.startMonth === experience.startMonth
  ) {
    score++;
  }

  if (
    experience.endYear &&
    linkedInExperience.endYear &&
    linkedInExperience.endYear === parseInt(experience.endYear)
  ) {
    score++;
  }

  if (
    experience.endMonth &&
    linkedInExperience.endMonth &&
    linkedInExperience.endMonth === experience.endMonth
  ) {
    score++;
  }

  if (
    !experience.endYear &&
    !experience.endMonth &&
    !linkedInExperience.endYear &&
    !linkedInExperience.endMonth
  ) {
    score++;
  }

  return score >= 3;
}

type CreateWorkExperienceInput = {
  linkedInExperience: LinkedInExperience;
  memberId: string;
  trx: Transaction<DB>;
};

async function createWorkExperience({
  linkedInExperience,
  memberId,
  trx,
}: CreateWorkExperienceInput) {
  const [companyId, location] = await Promise.all([
    saveCompanyIfNecessary(trx, linkedInExperience.companyId),
    getMostRelevantLocation(linkedInExperience.location, 'geocode'),
  ]);

  return trx
    .insertInto('workExperiences')
    .values({
      createdAt: new Date(),
      description: linkedInExperience.description,
      employmentType: linkedInExperience.employmentType,
      endDate: linkedInExperience.endDate,
      id: id(),
      linkedinSyncedAt: new Date(),
      locationType: linkedInExperience.locationType,
      startDate: linkedInExperience.startDate,
      studentId: memberId,
      title: linkedInExperience.position,
      updatedAt: new Date(),

      ...(companyId
        ? { companyId }
        : { companyName: linkedInExperience.companyName }),

      ...(!!location && {
        locationCity: location.city,
        locationCountry: location.country,
        locationState: location.state,
      }),
    })
    .execute();
}

type UpdateWorkExperienceInput = {
  existingExperience: Experience;
  linkedInExperience: LinkedInExperience;
  trx: Transaction<DB>;
};

async function updateWorkExperience({
  existingExperience,
  linkedInExperience,
  trx,
}: UpdateWorkExperienceInput) {
  const set: Updateable<DB['workExperiences']> = {};

  if (existingExperience.linkedinId !== linkedInExperience.companyId) {
    const companyId = await saveCompanyIfNecessary(
      trx,
      linkedInExperience.companyId
    );

    if (companyId) {
      set.companyId = companyId;
      set.companyName = null;
    } else {
      set.companyId = null;
      set.companyName = linkedInExperience.companyName;
    }
  }

  if (existingExperience.title !== linkedInExperience.position) {
    set.title = linkedInExperience.position;
  }

  if (existingExperience.description !== linkedInExperience.description) {
    set.description = linkedInExperience.description;
  }

  if (
    linkedInExperience.employmentType &&
    linkedInExperience.employmentType !== existingExperience.employmentType
  ) {
    set.employmentType = linkedInExperience.employmentType;
  }

  if (linkedInExperience.location) {
    const location = await getMostRelevantLocation(
      linkedInExperience.location,
      'geocode'
    );

    if (location) {
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

  if (
    linkedInExperience.locationType &&
    linkedInExperience.locationType !== existingExperience.locationType
  ) {
    set.locationType = linkedInExperience.locationType;
  }

  if (
    linkedInExperience.startDate &&
    linkedInExperience.startDate !== existingExperience.startDate
  ) {
    set.startDate = linkedInExperience.startDate;
  }

  if (
    linkedInExperience.endDate &&
    linkedInExperience.endDate !== existingExperience.endDate
  ) {
    set.endDate = linkedInExperience.endDate;
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
