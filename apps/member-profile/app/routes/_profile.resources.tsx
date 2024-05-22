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
import { ArrowUp, Clipboard, ExternalLink, Plus } from 'react-feather';
import { match } from 'ts-pattern';

import {
  cx,
  getButtonCn,
  getIconButtonCn,
  getTextCn,
  Pill,
  ProfilePicture,
  Text,
} from '@oyster/ui';

import { listResources } from '@/member-profile.server';
import { type ResourceType } from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { useToast } from '@/shared/hooks/use-toast';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const records = await listResources({
    limit: 100,
    page: 1,
    select: [
      'resources.description',
      'resources.id',
      'resources.link',
      'resources.postedAt',
      'resources.title',
      'resources.type',
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
  const toast = useToast();

  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-gray-200 p-4">
      <header className="flex justify-between gap-2">
        <Link
          className={cx(
            getTextCn({ variant: 'xl' }),
            'hover:text-primary hover:underline'
          )}
          to={generatePath(Route['/resources/:id'], { id: resource.id })}
        >
          {resource.title}
        </Link>

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
        <Pill color="orange-100">
          {match(resource.type as ResourceType)
            .with('attachment', () => 'Attachment')
            .with('url', () => 'URL')
            .exhaustive()}
        </Pill>

        {resource.tags.map((resource) => {
          return (
            <Pill color="pink-100" key={resource.id}>
              {resource.name}
            </Pill>
          );
        })}
      </ul>

      <section className="mt-auto flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <div className="flex w-fit items-center gap-2">
            <ProfilePicture
              initials={
                resource.authorFirstName![0] + resource.authorLastName![0]
              }
              size="32"
              src={resource.authorProfilePicture || undefined}
            />

            <Link
              className={cx(
                getTextCn({ color: 'gray-500', variant: 'sm' }),
                'hover:underline'
              )}
              to={generatePath(Route['/directory/:id'], {
                id: resource.authorId,
              })}
            >
              {resource.authorFirstName} {resource.authorLastName}
            </Link>
          </div>

          <Text color="gray-500" variant="sm">
            &bull;
          </Text>

          <Text color="gray-500" variant="sm">
            {resource.postedAt}
          </Text>
        </div>

        <ul className="flex items-center gap-1">
          {!!resource.link && (
            <>
              <li>
                <button
                  className={getIconButtonCn({
                    backgroundColor: 'gray-100',
                    backgroundColorOnHover: 'gray-200',
                  })}
                  onClick={() => {
                    navigator.clipboard.writeText(resource.link!);
                    toast({ message: 'Copied URL to clipboard!' });
                  }}
                  type="button"
                >
                  <Clipboard />
                </button>
              </li>

              <li>
                <Link
                  className={getIconButtonCn({
                    backgroundColor: 'gray-100',
                    backgroundColorOnHover: 'gray-200',
                  })}
                  target="_blank"
                  to={resource.link}
                >
                  <ExternalLink />
                </Link>
              </li>
            </>
          )}
        </ul>
      </section>
    </li>
  );
}
