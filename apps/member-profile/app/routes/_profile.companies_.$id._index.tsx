import { generatePath, type LoaderFunctionArgs, redirect } from 'react-router';

import { getCompany } from '@oyster/core/employment/server';

import { Route } from '@/shared/constants';

export async function loader({ params }: LoaderFunctionArgs) {
  const companyId = params.id as string;

  const company = await getCompany({
    include: ['reviews'],
    select: [],
    where: { id: companyId },
  });

  const to = Number(company?.reviews)
    ? generatePath(Route['/companies/:id/reviews'], { id: companyId })
    : generatePath(Route['/companies/:id/employees'], { id: companyId });

  return redirect(to);
}
