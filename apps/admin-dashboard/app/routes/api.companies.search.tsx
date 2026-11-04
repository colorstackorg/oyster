import { type LoaderFunctionArgs } from 'react-router';

import { listCompanies } from '@oyster/core/employment/server';
import { type SerializeFrom } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const search = url.searchParams.get('search') || '';

  const { companies } = await listCompanies({
    includeCompaniesWithoutEmployeesOrOpportunities: true,
    orderBy: 'most_employees',
    pagination: {
      limit: 50,
      page: 1,
    },
    select: [
      'companies.domain',
      'companies.id',
      'companies.imageUrl',
      'companies.name',
    ],
    where: { search },
  });

  return {
    companies,
  };
}

export type SearchCompaniesResult = SerializeFrom<typeof loader>;
