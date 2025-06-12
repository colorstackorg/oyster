import { z } from 'zod';

import { db } from '@oyster/db';
import { splitArray } from '@oyster/utils';

import { getDataset, startRun } from '@/modules/apify';
import { getCrunchbaseOrganization } from '../queries/get-crunchbase-organization';

const CompanyData = z.object({
  basic_info: z.object({ name: z.string(), universal_name: z.string() }),
  company_urn: z.string(),
  input_identifier: z.string(),
  media: z.object({ logo_url: z.string() }),
});

export async function migrateCrunchbaseToLinkedin() {
  const companies = await db
    .selectFrom('companies')
    .select(['crunchbaseId'])
    .orderBy('createdAt', 'asc')
    .limit(100)
    .execute();

  const map: Record<string, string> = {};

  const notFoundOnCrunchbase: string[] = [];
  const notFoundOnLinkedIn: string[] = [];

  await Promise.all(
    companies.map(async (company) => {
      const crunchbaseOrganization = await getCrunchbaseOrganization(
        company.crunchbaseId
      );

      if (crunchbaseOrganization.linkedInUrl) {
        map[crunchbaseOrganization.linkedInUrl] = company.crunchbaseId;
      } else {
        notFoundOnCrunchbase.push(company.crunchbaseId);
      }
    })
  );

  const batches = splitArray(Object.entries(map), 100);

  for (const batch of batches) {
    const datasetId = await startRun({
      actorId: 'apimaestro~linkedin-company-detail',
      body: {
        identifier: batch.map(([_, linkedinUrl]) => linkedinUrl),
      },
    });

    const dataset = await getDataset(datasetId, CompanyData.array());

    await db.transaction().execute(async (trx) => {
      for (const company of dataset) {
        if (
          !map[company.input_identifier] ||
          !company.company_urn ||
          !company.basic_info.universal_name ||
          !company.basic_info.name
        ) {
          notFoundOnLinkedIn.push(company.input_identifier);
          continue;
        }

        await trx
          .updateTable('companies')
          .set({
            linkedinId: company.company_urn,
            linkedinSlug: company.basic_info.universal_name,
            name: company.basic_info.name,
          })
          .where('crunchbaseId', '=', map[company.input_identifier])
          .execute();
      }
    });
  }

  console.log(
    'The following companies are missing LinkedIn URLs:',
    notFoundOnCrunchbase
  );

  console.log(
    'The following companies were not found on LinkedIn.',
    notFoundOnLinkedIn
  );
}
