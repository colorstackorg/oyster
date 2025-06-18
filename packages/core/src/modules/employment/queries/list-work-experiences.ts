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
      'workExperiences.companyId',
      'workExperiences.description',
      'workExperiences.employmentType',
      'workExperiences.endDate',
      'workExperiences.id',
      'workExperiences.locationCity',
      'workExperiences.locationCountry',
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
    .orderBy('workExperiences.endDate', 'desc')
    .orderBy('workExperiences.startDate', 'desc')
    .execute();

  const experiences = rows.map(({ endDate, startDate, ...row }) => {
    const startMonth = dayjs.utc(startDate).format('MMMM YYYY');

    const endMonth = endDate
      ? dayjs.utc(endDate).format('MMMM YYYY')
      : 'Present';

    return {
      ...row,
      date: `${startMonth} - ${endMonth}`,
      duration: getDuration(startDate, endDate),
    };
  });

  return experiences;
}

/**
 * Formats a duration between two dates into a human readable string.
 *
 * The format follows these rules:
 * - For durations < 1 year: Shows only months (e.g. "3 mos")
 * - For durations = 1 year: Shows only year (e.g. "1 yr")
 * - For durations > 1 year with months: Shows both (e.g. "2 yrs, 3 mos")
 *
 * Abbreviations used:
 * - Single month/year: "mo"/"yr"
 * - Multiple months/years: "mos"/"yrs"
 *
 * @param startDate - Date object
 * @param endDate - Date object
 * @returns Formatted duration string
 *
 * @example
 * // Returns "1 mo"
 * getDuration("2023-01-01", "2023-02-01")
 *
 * // Returns "3 mos"
 * getDuration("2023-01-01", "2023-04-01")
 *
 * // Returns "1 yr"
 * getDuration("2023-01-01", "2024-01-01")
 *
 * // Returns "2 yrs"
 * getDuration("2023-01-01", "2025-01-01")
 *
 * // Returns "1 yr, 3 mos"
 * getDuration("2023-01-01", "2024-04-01")
 *
 * // Returns "2 yrs, 1 mo"
 * getDuration("2023-01-01", "2025-02-01")
 */
function getDuration(startDate: Date, endDate?: Date | null) {
  endDate ||= new Date();

  const diff = dayjs(endDate).diff(dayjs(startDate), 'month') + 1;

  const years = Math.floor(diff / 12);
  const months = diff % 12;

  const monthLabel = months >= 2 ? 'mos' : 'mo';
  const yearLabel = years >= 2 ? 'yrs' : 'yr';

  const monthText = `${months} ${monthLabel}`;
  const yearText = `${years} ${yearLabel}`;

  if (years === 0) {
    return monthText;
  }

  if (months === 0) {
    return yearText;
  }

  return `${yearText}, ${monthText}`;
}
