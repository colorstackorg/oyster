import { json, type LoaderFunctionArgs } from '@remix-run/node';
import {
  Link,
  Outlet,
  Form as RemixForm,
  useLoaderData,
  useSearchParams,
  useSubmit,
} from '@remix-run/react';
import dayjs from 'dayjs';
import { Plus } from 'react-feather';
import { z } from 'zod';

import { isMemberAdmin } from '@oyster/core/admins';
import { track } from '@oyster/core/mixpanel';
import { getPresignedURL } from '@oyster/core/object-storage';
import {
  ListResourcesOrderBy,
  ListResourcesWhere,
  type ResourceType,
} from '@oyster/core/resources';
import { listResources, listTags } from '@oyster/core/resources.server';
import {
  Dashboard,
  ExistingSearchParams,
  getButtonCn,
  Pagination,
  Pill,
  Select,
  Text,
} from '@oyster/ui';
import { iife } from '@oyster/utils';

import { ListSearchParams } from '@/member-profile.ui';
import { Resource } from '@/shared/components/resource';
import { Route } from '@/shared/constants';
import { getTimezone } from '@/shared/cookies.server';
import { ensureUserAuthenticated, user } from '@/shared/session.server';

const whereKeys = ListResourcesWhere.keyof().enum;

const ResourcesSearchParams = ListSearchParams.pick({
  limit: true,
  page: true,
}).extend({
  [whereKeys.id]: ListResourcesWhere.shape.id.catch(undefined),
  [whereKeys.search]: ListResourcesWhere.shape.search,
  [whereKeys.tags]: ListResourcesWhere.shape.tags.catch([]),
  orderBy: ListResourcesOrderBy,
  postedAfter: z.string().optional(),
  postedBefore: z.string().optional(),
});

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await ensureUserAuthenticated(request);

  const isAdmin = await isMemberAdmin(user(session));

  const url = new URL(request.url);

  const searchParams = ResourcesSearchParams.parse({
    ...Object.fromEntries(url.searchParams),
    tags: url.searchParams.getAll('tags'),
  });

  const postedAfter = searchParams.postedAfter
    ? new Date(searchParams.postedAfter)
    : undefined;

  const postedBefore = searchParams.postedBefore
    ? new Date(searchParams.postedBefore)
    : undefined;

  const { resources: records, totalCount } = await listResources({
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
    where: {
      id: searchParams.id,
      search: searchParams.search,
      tags: searchParams.tags,
      postedAfter,
      postedBefore,
    },
  });

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
            .tz(getTimezone(request))
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

  const tags = await iife(async () => {
    const result: { id: string; name: string; param: string }[] = [];

    // If there is an ID in the search params, we want to show a tag for it
    // to make it clear that the search is for a specific resource.
    if (searchParams.id && resources[0]) {
      result.push({
        id: searchParams.id,
        name: resources[0].title as string,
        param: whereKeys.id,
      });
    }

    // To show tags for the search, we need to fetch the tag names.
    if (searchParams.tags.length) {
      const tags = await listTags({
        pagination: { limit: 10, page: 1 },
        select: ['tags.id', 'tags.name'],
        where: { ids: searchParams.tags },
      });

      tags.forEach((tag) => {
        result.push({
          ...tag,
          param: whereKeys.tags,
        });
      });
    }

    return result;
  });

  track({
    event: 'Page Viewed',
    properties: { Page: 'Resources' },
    request,
    user: user(session),
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
        <AddResourceLink />
      </header>

      <section className="flex flex-wrap gap-4">
        <Dashboard.SearchForm placeholder="Search by title...">
          <ExistingSearchParams exclude={['page']} />
        </Dashboard.SearchForm>
        <SortResourcesForm />
      </section>

      <CurrentTagsList />
      <ResourcesList />
      <ResourcesPagination />
      <Outlet />
    </>
  );
}

function AddResourceLink() {
  const [searchParams] = useSearchParams();

  return (
    <Link
      className={getButtonCn({})}
      to={{
        pathname: Route['/resources/add'],
        search: searchParams.toString(),
      }}
    >
      <Plus size={16} /> Add Resource
    </Link>
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
    </RemixForm>
  );
}

function CurrentTagsList() {
  const { tags } = useLoaderData<typeof loader>();
  const [_searchParams] = useSearchParams();

  if (!tags.length) {
    return null;
  }

  return (
    <ul className="flex flex-wrap items-center gap-2">
      {tags.map((tag) => {
        const searchParams = new URLSearchParams(_searchParams);

        // Since there could be multiple tags, we need to specify the value
        // along with the key.
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
