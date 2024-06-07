import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { generatePath, NavLink, Outlet, useLoaderData } from '@remix-run/react';
import { ExternalLink } from 'react-feather';

import { getCompany } from '@oyster/core/employment.server';
import { cx, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const company = await getCompany({
    select: [
      'companies.description',
      'companies.domain',
      'companies.id',
      'companies.imageUrl',
      'companies.name',
    ],
    where: { id: params.id as string },
  });

  if (!company) {
    throw new Response(null, { status: 404 });
  }

  return json({
    company,
  });
}

export default function CompanyLayout() {
  const { company } = useLoaderData<typeof loader>();

  return (
    <section className="mx-auto flex w-full max-w-[36rem] flex-col gap-[inherit]">
      <header className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg border border-gray-200 p-1">
          <img
            className="aspect-square h-full w-full rounded-md"
            src={company.imageUrl as string}
          />
        </div>

        <div>
          <Text variant="2xl" weight="500">
            {company.name}
          </Text>

          {company.domain && (
            <a
              className="flex items-center gap-1 text-sm text-gray-500 hover:underline"
              href={'https://' + company.domain}
              target="_blank"
            >
              {company.domain} <ExternalLink size="16" />
            </a>
          )}
        </div>
      </header>

      <nav>
        <ul className="flex items-center gap-4">
          <li>
            <NavLink
              className={({ isActive }) => {
                return cx(
                  'underline hover:text-primary',
                  isActive && 'text-primary underline'
                );
              }}
              to={generatePath(Route['/companies/:id/overview'], {
                id: company.id,
              })}
            >
              Overview
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) => {
                return cx(
                  'underline hover:text-primary',
                  isActive && 'text-primary underline'
                );
              }}
              to={generatePath(Route['/companies/:id/reviews'], {
                id: company.id,
              })}
            >
              Reviews
            </NavLink>
          </li>
          <li>
            <NavLink
              className={({ isActive }) => {
                return cx(
                  'underline hover:text-primary',
                  isActive && 'text-primary underline'
                );
              }}
              to={generatePath(Route['/companies/:id/employees'], {
                id: company.id,
              })}
            >
              Employees
            </NavLink>
          </li>
        </ul>
      </nav>

      <Outlet />
    </section>
  );
}
