import { type LoaderFunctionArgs } from 'react-router';

import { listCompanies } from '@oyster/core/employment/server';
import { type SerializeFrom } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const search = url.searchParams.get('search') || '';

  const { companies } = await listCompanies({
    orderBy: 'most_employees',
    pagination: {
      limit: 100,
      page: 1,
    },
    select: ['companies.id', 'companies.name'],
    where: { search },
  });

  return {
    companies,
  };
}

export type SearchCompaniesResult = SerializeFrom<typeof loader>;
