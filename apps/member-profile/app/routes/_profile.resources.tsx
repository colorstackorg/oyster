import {
  json,
  type LoaderFunctionArgs,
  type SerializeFrom,
} from '@remix-run/node';
import {
  generatePath,
  Link,
  Outlet,
  Form as RemixForm,
  useFetcher,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowUp, Edit, Plus, Share } from 'react-feather';
import { match } from 'ts-pattern';

import { getObjectPresignedUri } from '@oyster/infrastructure/object-storage';
import {
  cx,
  Dashboard,
  getButtonCn,
  getIconButtonCn,
  getTextCn,
  Pagination,
  Pill,
  ProfilePicture,
  Select,
  Text,
} from '@oyster/ui';
import { iife } from '@oyster/utils';

import { listResources, listTags } from '@/member-profile.server';
import {
  ListResourcesOrderBy,
  ListResourcesWhere,
  ListSearchParams,
  type ResourceType,
} from '@/member-profile.ui';
import { Route } from '@/shared/constants';
import { useToast } from '@/shared/hooks/use-toast';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const ResourcesSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
})
  .merge(ListResourcesWhere)
  .extend({ orderBy: ListResourcesOrderBy });

const keys = ResourcesSearchParams.keyof().enum;

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const url = new URL(request.url);

  const searchParams = ResourcesSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    tags: url.searchParams.getAll('tags'),
  });

  const { resources: records, totalCount } = await listResources({
    limit: searchParams.limit,
    memberId: user(session),
    page: searchParams.page,
    orderBy: searchParams.orderBy,
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
      id: searchParams.id,
      search: searchParams.search,
      tags: searchParams.tags,
    },
  });

  const resources = await Promise.all(
    records.map(
      async ({ attachments, postedAt, tags, upvotes, upvoted, ...record }) => {
        return {
          ...record,
          attachments: await Promise.all(
            (attachments || [])
              .filter((attachment) => {
                return !!attachment.s3Key;
              })
              .map((attachment) => {
                return getObjectPresignedUri({
                  key: attachment.s3Key,
                });
              })
          ),
          editable: record.authorId === user(session),
          postedAt: dayjs().to(postedAt),
          shareableUri: `${url.protocol}://${url.host}/resources?id=${record.id}`,
          tags: tags!,
          upvotes: Number(upvotes),
          upvoted: Boolean(upvoted),
        };
      }
    )
  );

  const tags = await iife(async () => {
    const result: { id: string; name: string; param: string }[] = [];

    if (searchParams.id && resources[0]) {
      result.push({
        id: searchParams.id,
        name: resources[0].title as string,
        param: keys.id,
      });
    }

    if (searchParams.tags.length) {
      const tags = await listTags({
        limit: 100,
        page: 1,
        select: ['tags.id', 'tags.name'],
        where: { ids: searchParams.tags },
      });

      tags.forEach((tag) => {
        result.push({
          ...tag,
          param: keys.tags,
        });
      });
    }

    return result;
  });

  return json({
    limit: searchParams.limit,
    orderBy: searchParams.orderBy,
    page: searchParams.page,
    resources,
    tags,
    totalCount,
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

      <section className="flex gap-4">
        <Dashboard.SearchForm placeholder="Search by title..." />
        <SortResourcesForm />
      </section>

      <AppliedTagsList />
      <ResourcesList />
      <ResourcesPagination />
      <Outlet />
    </>
  );
}

function SortResourcesForm() {
  const { orderBy } = useLoaderData<typeof loader>();

  const submit = useSubmit();

  const sortKeys = ListResourcesOrderBy._def.innerType.enum;

  return (
    <RemixForm
      className="flex min-w-[12rem] items-center gap-4"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Select
        defaultValue={orderBy}
        name={keys.orderBy}
        id={keys.orderBy}
        placeholder="Sort By..."
        required
      >
        <option value={sortKeys.newest}>Newest</option>
        <option value={sortKeys.most_upvotes}>Most Upvotes</option>
      </Select>
    </RemixForm>
  );
}

function ResourcesPagination() {
  const { limit, resources, page, totalCount } = useLoaderData<typeof loader>();

  return (
    <Pagination
      dataLength={resources.length}
      page={page}
      pageSize={limit}
      totalCount={totalCount}
    />
  );
}

function AppliedTagsList() {
  const { tags } = useLoaderData<typeof loader>();
  const [_searchParams] = useSearchParams();

  if (!tags.length) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => {
        const searchParams = new URLSearchParams(_searchParams);

        searchParams.delete(tag.param, tag.id);

        return (
          <li key={tag.id}>
            <Pill
              color="pink-100"
              onCloseHref={{ search: searchParams.toString() }}
            >
              {tag.name}
            </Pill>
          </li>
        );
      })}
    </ul>
  );
}

function ResourcesList() {
  const { resources } = useLoaderData<typeof loader>();

  if (!resources.length) {
    return (
      <div className="mt-4">
        <Text color="gray-500">There were no resources found.</Text>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-2 @[800px]:grid-cols-2 @[1200px]:grid-cols-3 @[1600px]:grid-cols-4">
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
          target="_blank"
          to={resource.link || resource.attachments?.[0]}
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

        {resource.tags.map((tag) => {
          return <TagPill key={tag.id} id={tag.id} name={tag.name} />;
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
          {!!resource.editable && (
            <li>
              <Link
                className={getIconButtonCn({
                  backgroundColor: 'gray-100',
                  backgroundColorOnHover: 'gray-200',
                })}
                to={generatePath(Route['/resources/:id/edit'], {
                  id: resource.id,
                })}
              >
                <Edit />
              </Link>
            </li>
          )}

          <li>
            <button
              className={getIconButtonCn({
                backgroundColor: 'gray-100',
                backgroundColorOnHover: 'gray-200',
              })}
              onClick={() => {
                navigator.clipboard.writeText(resource.shareableUri);
                toast({ message: 'Copied URL to clipboard!' });
              }}
              type="button"
            >
              <Share />
            </button>
          </li>
        </ul>
      </section>
    </li>
  );
}

function TagPill({ id, name }: ResourceInView['tags'][number]) {
  const [searchParams] = useSearchParams();

  if (!searchParams.getAll('tags').includes(id)) {
    searchParams.append('tags', id);
  }

  return (
    <Pill color="pink-100" to={{ search: searchParams.toString() }}>
      {name}
    </Pill>
  );
}
