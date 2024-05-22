import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  generatePath,
  Link,
  useFetcher,
  useLoaderData,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowUp } from 'react-feather';

import { cx, getTextCn, Modal, Pill, ProfilePicture, Text } from '@oyster/ui';

import { getResource } from '@/member-profile.server';
import { Route } from '@/shared/constants';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ params, request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const record = await getResource({
    memberId: user(session),
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
      id: params.id as string,
    },
  });

  const resource = {
    ...record,
    postedAt: dayjs().to(record.postedAt),
    upvotes: Number(record.upvotes),
    upvoted: Boolean(record.upvoted),
  };

  return json({
    resource,
  });
}

export default function ResourcePage() {
  return (
    <Modal onCloseTo={Route['/resources']}>
      <ResourceItem />
    </Modal>
  );
}

function ResourceItem() {
  const { resource } = useLoaderData<typeof loader>();

  const fetcher = useFetcher();

  return (
    <div className="flex flex-col gap-3">
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
    </div>
  );
}
