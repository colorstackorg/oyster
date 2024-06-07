import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';

import { getCompany } from '@oyster/core/employment.server';
import { Text } from '@oyster/ui';

import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const company = await getCompany({
    select: ['companies.description'],
    where: { id: params.id as string },
  });

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  return json({
    company,
  });
}

export default function CompanyOverviewPage() {
  const { company } = useLoaderData<typeof loader>();

  return (
    <>
      <Text color="gray-500">{company.description}</Text>
    </>
  );
}
