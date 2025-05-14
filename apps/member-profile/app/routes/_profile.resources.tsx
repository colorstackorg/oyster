import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Form,
  Link,
  Outlet,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { ArrowUp, Plus, Tag, User } from 'react-feather';
import { z } from 'zod';

import { isMemberAdmin } from '@oyster/core/admins';
import { ListSearchParams } from '@oyster/core/member-profile/ui';
import { track } from '@oyster/core/mixpanel';
import {
  ListResourcesOrderBy,
  ListResourcesWhere,
  type ResourceType,
} from '@oyster/core/resources';
import { listResources } from '@oyster/core/resources/server';
import { getPresignedURL } from '@oyster/core/s3';
import { db } from '@oyster/db';
import { ISO8601Date } from '@oyster/types';
import {
  Button,
  Dashboard,
  ExistingSearchParams,
  Pagination,
  Select,
  Text,
} from '@oyster/ui';
import {
  FilterEmptyMessage,
  FilterItem,
  FilterList,
  FilterPopover,
  FilterRoot,
  FilterSearch,
  FilterTrigger,
  useFilterContext,
} from '@oyster/ui/filter';
import { run, toEscapedString } from '@oyster/utils';

import { Resource } from '@/shared/components/resource';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const ResourcesSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  date: ISO8601Date.optional().catch(undefined),
  id: ListResourcesWhere.shape.id.catch(undefined),
  isMyPosts: z.string().optional().catch(undefined),
  isMyUpvotes: z.string().optional().catch(undefined),
  orderBy: ListResourcesOrderBy,
  search: ListResourcesWhere.shape.search,
  tags: ListResourcesWhere.shape.tags.catch([]),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const isAdmin = await isMemberAdmin(user(session));

  const url = new URL(request.url);

  const searchParams = ResourcesSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    tags: url.searchParams.getAll('tag'),
  });

  const [allTags, appliedTags, { resources: records, totalCount }] =
    await Promise.all([
      listAllTags(),
      listAppliedTags(url.searchParams),
      listResources({
        memberId: user(session),
        pagination: {
          limit: searchParams.limit,
          page: searchParams.page,
        },
        orderBy: searchParams.orderBy,
        select: [
          'resources.description',
          'resources.id',
          'resources.link',
          'resources.postedAt',
          'resources.title',
          'resources.type',
          'students.firstName as posterFirstName',
          'students.id as posterId',
          'students.lastName as posterLastName',
          'students.profilePicture as posterProfilePicture',
        ],
        isMyPosts: !!searchParams.isMyPosts,
        isMyUpvotes: !!searchParams.isMyUpvotes,
        where: {
          id: searchParams.id,
          search: searchParams.search,
          tags: searchParams.tags,

          ...(searchParams.date &&
            run(() => {
              const date = dayjs(searchParams.date).tz(
                'America/Los_Angeles',
                true
              );

              return {
                postedAfter: date.startOf('day').toDate(),
                postedBefore: date.endOf('day').toDate(),
              };
            })),
        },
      }),
    ]);

  const tz = getTimezone(request);

  const resources = await Promise.all(
    records.map(
      async ({
        attachments,
        postedAt,
        tags,
        upvotes,
        upvoted,
        views,
        ...record
      }) => {
        return {
          ...record,

          // If there are any attachments, we need to generate a presigned URL
          // to the object in the Cloudflare R2 bucket.
          attachments: await Promise.all(
            (attachments || []).map(async (attachment) => {
              return {
                mimeType: attachment.mimeType,
                uri: await getPresignedURL({
                  expiresIn: 60 * 60, // 1 hour
                  key: attachment.objectKey,
                }),
              };
            })
          ),

          // If the logged-in member is the poster of the resource, they should
          // be able to edit the resource.
          editable: record.posterId === user(session) || isAdmin,

          // This is a relative time of when the resource was posted,
          // ie: "2d" (2 days ago).
          postedAt: dayjs().to(postedAt),

          postedAtExpanded: dayjs(postedAt)
            .tz(tz)
            .format('MMM DD, YYYY • h:mm A'),

          // This is the URL that can be shared with others to view the
          // resource. Note: This is a URL to our application, not the _actual_
          // resource URL (which has permissions via the presigned URL).
          shareableUri: `${url.protocol}//${url.host}/resources?id=${record.id}`,

          tags: tags!,
          upvotes: Number(upvotes),
          upvoted: Boolean(upvoted),
          views: Number(views),
        };
      }
    )
  );

  track({
    event: 'Page Viewed',
    properties: { Page: 'Resources' },
    request,
    user: user(session),
  });

  return json({
    allTags,
    appliedTags,
    limit: searchParams.limit,
    orderBy: searchParams.orderBy,
    page: searchParams.page,
    resources,
    totalCount,
  });
}

async function listAllTags() {
  const tags = await db
    .selectFrom('resources')
    .innerJoin('resourceTags', 'resourceTags.resourceId', 'resources.id')
    .innerJoin('tags', 'tags.id', 'resourceTags.tagId')
    .select([
      'tags.id',
      'tags.name',
      ({ fn }) => fn.countAll<string>().as('count'),
    ])
    .groupBy(['tags.id', 'tags.name'])
    .orderBy('count', 'desc')
    .execute();

  return tags;
}

async function listAppliedTags(searchParams: URLSearchParams) {
  const tagsFromSearch = searchParams.getAll('tag');

  if (!tagsFromSearch.length) {
    return [];
  }

  const tags = await db
    .selectFrom('tags')
    .select(['tags.id', 'tags.name'])
    .where((eb) => {
      return eb.or([
        eb('tags.id', 'in', tagsFromSearch),
        eb('tags.name', 'in', tagsFromSearch),
      ]);
    })
    .execute();

  return tags;
}

export default function ResourcesPage() {
  return (
    <>
      <header className="flex items-center justify-between gap-4">
        <Text variant="2xl">Resources 📚</Text>
        <AddResourceLink />
      </header>

      <section className="flex flex-wrap gap-4">
        <Dashboard.SearchForm placeholder="Search by title...">
          <ExistingSearchParams exclude={['page']} />
        </Dashboard.SearchForm>

        <div className="flex flex-wrap gap-2">
          <MyUpvotesFilter />
          <MyPostsFilter />
          <TagFilter />
          <SortResourcesForm />
        </div>
      </section>

      <ResourcesList />
      <ResourcesPagination />
      <Outlet />
    </>
  );
}

function AddResourceLink() {
  const [searchParams] = useSearchParams();

  return (
    <Button.Slot>
      <Link
        to={{
          pathname: Route['/resources/add'],
          search: searchParams.toString(),
        }}
      >
        <Plus size={20} /> Add Resource
      </Link>
    </Button.Slot>
  );
}

function TagFilter() {
  const { appliedTags } = useLoaderData<typeof loader>();

  return (
    <FilterRoot
      multiple
      name="tag"
      selectedValues={appliedTags.map((tag) => {
        return {
          color: 'pink-100',
          label: tag.name,
          value: tag.id,
        };
      })}
    >
      <FilterTrigger icon={<Tag />}>Tags</FilterTrigger>

      <FilterPopover>
        <FilterSearch />
        <TagList />
      </FilterPopover>
    </FilterRoot>
  );
}

function TagList() {
  const { allTags } = useLoaderData<typeof loader>();
  const { search } = useFilterContext();

  const regex = new RegExp(toEscapedString(search), 'i');

  const filteredTags = allTags.filter((tag) => {
    return regex.test(tag.name);
  });

  if (!filteredTags.length) {
    return <FilterEmptyMessage>No tags found.</FilterEmptyMessage>;
  }

  return (
    <FilterList>
      {filteredTags.map((tag) => {
        const label = tag.count ? `${tag.name} (${tag.count})` : tag.name;

        return (
          <FilterItem
            color="pink-100"
            key={tag.id}
            label={label}
            value={tag.id}
          />
        );
      })}
    </FilterList>
  );
}

function MyUpvotesFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const isMyUpvotes = searchParams.has('isMyUpvotes');

  function toggle() {
    setSearchParams((params) => {
      params.delete('page');

      if (params.has('isMyUpvotes')) {
        params.delete('isMyUpvotes');
      } else {
        params.set('isMyUpvotes', '1');
      }

      return params;
    });
  }

  return (
    <FilterTrigger
      active={isMyUpvotes}
      icon={<ArrowUp />}
      onClick={toggle}
      popover={false}
    >
      My Upvotes
    </FilterTrigger>
  );
}

function MyPostsFilter() {
  const [searchParams, setSearchParams] = useSearchParams();

  const isMyPosts = searchParams.has('isMyPosts');

  function toggle() {
    setSearchParams((params) => {
      params.delete('page');

      if (params.has('isMyPosts')) {
        params.delete('isMyPosts');
      } else {
        params.set('isMyPosts', '1');
      }

      return params;
    });
  }

  return (
    <FilterTrigger
      active={isMyPosts}
      icon={<User />}
      onClick={toggle}
      popover={false}
    >
      My Posts
    </FilterTrigger>
  );
}

function SortResourcesForm() {
  const { orderBy } = useLoaderData<typeof loader>();
  const submit = useSubmit();

  const sortKeys = ListResourcesOrderBy._def.innerType.enum;

  return (
    <Form
      className="flex min-w-[12rem] items-center gap-4"
      method="get"
      onChange={(e) => submit(e.currentTarget)}
    >
      <Select
        defaultValue={orderBy}
        name="orderBy"
        id="orderBy"
        placeholder="Sort By..."
        required
        width="fit"
      >
        <option value={sortKeys.newest}>Newest</option>
        <option value={sortKeys.most_upvotes}>Most Upvotes</option>
      </Select>

      <ExistingSearchParams exclude={['orderBy']} />
    </Form>
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

// List

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
    <Resource.List>
      {resources.map((resource) => {
        return (
          <Resource
            key={resource.id}
            attachments={resource.attachments}
            description={resource.description}
            editable={resource.editable}
            id={resource.id}
            link={resource.link}
            postedAt={resource.postedAt}
            postedAtExpanded={resource.postedAtExpanded}
            posterFirstName={resource.posterFirstName as string}
            posterId={resource.posterId as string}
            posterLastName={resource.posterLastName as string}
            posterProfilePicture={resource.posterProfilePicture}
            shareableUri={resource.shareableUri}
            tags={resource.tags}
            title={resource.title}
            type={resource.type as ResourceType}
            upvoted={resource.upvoted}
            upvotes={resource.upvotes}
            views={resource.views}
          />
        );
      })}
    </Resource.List>
  );
}
