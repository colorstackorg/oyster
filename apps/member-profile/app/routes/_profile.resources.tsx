import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowUp, Plus } from 'react-feather';

import {
  cx,
  getButtonCn,
  getTextCn,
  Pill,
  ProfilePicture,
  Text,
} from '@oyster/ui';

import { listResources } from '@/member-profile.server';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const records = await listResources({
    limit: 100,
    page: 1,
    select: [
      'resources.description',
      'resources.id',
      'resources.postedAt',
      'resources.title',
      'students.firstName as authorFirstName',
      'students.id as authorId',
      'students.lastName as authorLastName',
      'students.profilePicture as authorProfilePicture',
    ],
    where: {
      memberId: user(session),
      search: '',
      tags: [],
    },
  });

  const resources = records.map(({ postedAt, upvotes, upvoted, ...record }) => {
    return {
      ...record,
      postedAt: dayjs().to(postedAt),
      upvotes: Number(upvotes),
      upvoted: Boolean(upvoted),
    };
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
    <ul className="grid grid-cols-1 gap-2 overflow-scroll @[800px]:grid-cols-2 @[1200px]:grid-cols-3 @[1600px]:grid-cols-4">
      {resources.map((resource) => {
        return <ResourceItem key={resource.id} resource={resource} />;
      })}
    </ul>
  );
}

type ResourceInView = SerializeFrom<typeof loader>['resources'][number];

function ResourceItem({ resource }: { resource: ResourceInView }) {
  const fetcher = useFetcher();

  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-gray-200 p-4">
      <header className="flex justify-between gap-2">
        <Text variant="xl">{resource.title}</Text>

        <fetcher.Form
          action={
            resource.upvoted
              ? `/api/resources/${resource.id}/downvote`
              : `/api/resources/${resource.id}/upvote`
          }
          method="post"
        >
          <button
            className={cx(
              getTextCn({ color: 'gray-500', variant: 'sm' }),
              'flex h-fit items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5',
              resource.upvoted && 'border-primary bg-primary text-white',
              !resource.upvoted && 'hover:border-primary hover:text-primary'
            )}
            type="submit"
          >
            <ArrowUp size="16" /> <span>{resource.upvotes}</span>
          </button>
        </fetcher.Form>
      </header>

      <Text className="line-clamp-2" color="gray-500" variant="sm">
        {resource.description}
      </Text>

      <ul className="mb-2 flex flex-wrap items-center gap-1">
        {resource.tags.map((resource) => {
          return (
            <Pill color="pink-100" key={resource.id}>
              {resource.name}
            </Pill>
          );
        })}
      </ul>

      <div className="mt-auto flex items-center gap-1">
        <Link
          className="flex w-fit items-center gap-2"
          to={generatePath(Route['/directory/:id'], { id: resource.authorId })}
        >
          <ProfilePicture
            initials={
              resource.authorFirstName![0] + resource.authorLastName![0]
            }
            size="32"
            src={resource.authorProfilePicture || undefined}
          />

          <Text className="line-clamp-2" color="gray-500" variant="sm">
            {resource.authorFirstName} {resource.authorLastName}
          </Text>
        </Link>

        <Text color="gray-500" variant="sm">
          &bull;
        </Text>

        <Text color="gray-500" variant="sm">
          {resource.postedAt}
        </Text>
      </div>
    </li>
  );
}
