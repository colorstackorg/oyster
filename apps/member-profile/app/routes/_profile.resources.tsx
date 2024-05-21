import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet } from '@remix-run/react';
import { Plus } from 'react-feather';

import { getButtonCn, Text } from '@oyster/ui';

import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  return json({});
}

export default function ResourcesPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <Text variant="2xl">Resources 📚</Text>

        <Link className={getButtonCn({})} to={Route['/resources/add']}>
          <Plus size={16} /> Add Resource
        </Link>
      </header>

      <Outlet />
    </>
  );
}
