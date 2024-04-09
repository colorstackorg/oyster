import { ListSearchParams } from '@/shared/types';
import { Company, EmploymentType, JobOfferStatus } from '../employment.types';
import { db } from '@/infrastructure/database';
import { sql } from 'kysely';
import { z } from 'zod';
import { ExtractValue } from '@oyster/types';

const JobOfferFilterParams = z.object({
  company: Company.shape.id.nullable().catch(null),
  employmentType: z.nativeEnum(EmploymentType),
  location: z.string().trim().min(1).nullable().catch(null),
  status: z.nativeEnum(JobOfferStatus),
});

const JobOfferFilterParam = JobOfferFilterParams.keyof().enum;

const JobOfferSearchParams = ListSearchParams.omit({
  timezone: true,
  search: true,
}).merge(JobOfferFilterParams);

type JobOfferFilterParam = ExtractValue<typeof JobOfferFilterParam>;
type JobOfferSearchParams = z.infer<typeof JobOfferSearchParams>;

async function listJobOffers({
  company,
  employmentType,
  location,
  status,
}: JobOfferSearchParams) {
  const query = db
    .selectFrom('jobOffers')
    .$if(!!company, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFrom('jobOffers')
            .where('companies.crunchbaseId', '=', company)
        );
      });
    })
    .$if(!!employmentType, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb
            .selectFom('jobOffers')
            .where('jobOffers.employmentType', '=', employmentType)
        );
      });
    })
    .$if(!!location, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb.selectFrom('jobOffers').where('jobOffers.location', '=', location)
        );
      });
    })
    .$if(!!status, (query) => {
      return query.where((eb) => {
        return eb.exists(
          eb.selectFrom('jobOffers').where('jobOffers.status', '=', status)
        );
      });
    });

  const [joboffers, { count }] = await Promise.all([
    query.select([
      'jobOffers.company',
      'jobOffers.employmentType',
      'jobOffers.',
    ]),
  ]);
}
