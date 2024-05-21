import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import { generatePath, Link, Outlet, useLoaderData } from '@remix-run/react';
import { Plus } from 'react-feather';

import { getButtonCn, Text } from '@oyster/ui';

import { listResources } from '@/member-profile.server';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  await ensureUserAuthenticated(request);

  const resources = await listResources({
    limit: 100,
    page: 1,
    select: ['id', 'title', 'description', 'postedAt'],
    where: {
      search: '',
      tags: [],
    },
  });

  return json({
    resources,
  });
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

      <ResourcesList />

      <Outlet />
    </>
  );
}

function ResourcesList() {
  const { resources } = useLoaderData<typeof loader>();

  return (
    <ul className="grid grid-cols-1 gap-2 overflow-scroll @[800px]:grid-cols-2 @[1200px]:grid-cols-3">
      {resources.map((resource) => {
        return <ResourceItem key={resource.id} resource={resource} />;
      })}
    </ul>
  );
}

type ResourceInView = SerializeFrom<typeof loader>['resources'][number];

function ResourceItem({ resource }: { resource: ResourceInView }) {
  return (
    <li>
      <Link
        className="grid grid-cols-[3rem,1fr] items-center gap-4 rounded-2xl p-2 hover:bg-gray-100 sm:grid-cols-[4rem,1fr]"
        to={generatePath(Route['/resources/:id'], { id: resource.id })}
      >
        <div>
          <Text variant="xl">{resource.title}</Text>

          <Text className="line-clamp-2" color="gray-500" variant="sm">
            {resource.description}
          </Text>
        </div>
      </Link>
    </li>
  );
}
